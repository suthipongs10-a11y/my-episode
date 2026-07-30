#!/usr/bin/env python3
# =============================================================================
# Phase 1 gate, driven by packets instead of by a human
# =============================================================================
# Logs in, creates a character and walks it, speaking the real RO protocol to
# the real login/char/map servers. Standard library only, no GRF, no client.
#
#   ./tools/smoke-play.py                 # against the running stack
#   ./tools/smoke-play.py --verbose       # dump every packet exchanged
#
# Why this exists
# ---------------
# CLAUDE.md's Phase 1 gate is "a standard PC client connects, creates a
# character, walks around". That is the right thing to require, and it needs a
# ~4 GB kRO client on a Windows machine. This proves the same three claims
# without either, so the gate is never blocked on a download, and — the part
# that matters more — it can run on every deploy instead of once.
#
# It does not replace the manual test. A real client also exercises the GRF,
# the sprites and the client-side content tables, and only a human can say the
# game feels right. What this catches is the server side: authentication, the
# login->char->map handoff, character creation, map loading, and movement.
#
# It is also the first half of Phase 3's homework. The wsProxy has to carry
# exactly these bytes, and writing this is how we learn what they are.
#
# Reading the protocol
# --------------------
# Packet IDs are shuffled per packetver, so no wiki value can be trusted. The
# ids below were derived by preprocessing rAthena's own tables at PACKETVER
# 20180307 and taking the last registration of each id, which is what
# packetdb_addpacket() does at runtime.
#
# The table moved from 20180620 to 20180307 on 2026-07-30 because the PC client
# could not work at 20180620: roBrowser's newest shuffle table is 20180307, so
# above it the client's map-enter and movement packets reach no handler. Two ids
# changed with the move, both on the map-server — CZ_ENTER and CZ_REQUEST_MOVE.
# tools/check-client-protocol.mjs is what measured that and what will catch it
# the next time this number moves.
#
# Two files, in this order, and missing the second one costs an afternoon:
#
#     packetdb_readdb()  src/map/clif.cpp
#       #include "clif_packetdb.hpp"    <- the base table
#       #include "clif_shuffle.hpp"     <- the per-version shuffle, and it WINS
#
# clif_packetdb.hpp alone says 0x0437 is CZ_REQUEST_MOVE. The shuffle file
# overrides that, and the live server proved it by disconnecting us:
#
#     clif_parse: Received packet 0x0437 with expected packet length 7,
#     but only 5 bytes remaining, disconnecting session #9
#
# Keep that line. It is the oracle: any regenerated table must still come out
# with 0x0437 as a 7-byte ActionRequest, or the derivation is wrong again.
#
# If PACKETVER in .env changes, regenerate against BOTH files.
# =============================================================================

import argparse
import os
import re
import socket
import sys
import time

# --- packet identifiers, for PACKETVER 20180307 ------------------------------
# Verified against server/rathena at the pinned submodule commit:
#   CA_LOGIN            src/common/packets.hpp        DEFINE_PACKET_HEADER(CA_LOGIN, 0x64)
#   AC_ACCEPT_LOGIN     ditto, PACKETVER >= 20170315 branch  -> 0xac4
#   CH_MAKE_CHAR        ditto, PACKETVER >= 20151001 branch  -> 0xa39
#   HC_NOTIFY_ZONESVR   ditto, PACKETVER >= 20170315 branch  -> 0xac5
#   ZC_ACCEPT_ENTER     src/map/packets.hpp, <20141022||>=20160330 -> 0x2eb
#   CZ_* below           clif_packetdb.hpp + clif_shuffle.hpp, preprocessed
EXPECTED_PACKETVER = 20180307

CA_LOGIN = 0x0064
AC_ACCEPT_LOGIN = 0x0AC4
AC_REFUSE_LOGIN = 0x083E

CH_ENTER = 0x0065
CH_MAKE_CHAR = 0x0A39
CH_SELECT_CHAR = 0x0066
HC_ACCEPT_ENTER = 0x006B
HC_REFUSE_ENTER = 0x006C
HC_ACCEPT_MAKECHAR = 0x006D
HC_REFUSE_MAKECHAR = 0x006E
HC_ACCEPT_ENTER2 = 0x082D
HC_CHARLIST_NOTIFY = 0x09A0
HC_BLOCK_CHARACTER = 0x020D
HC_NOTIFY_ZONESVR = 0x0AC5
SC_NOTIFY_BAN = 0x0081

# These four are the shuffle's final word for 20180307 — what a real client of
# this version sends, not merely an id the server would also accept. Several
# stale ids stay registered and would work; using the authentic ones keeps this
# an honest rehearsal of the traffic the Phase 3 proxy has to carry.
CZ_ENTER = 0x07E4              # clif_parse_WantToConnection, 19 bytes
CZ_NOTIFY_ACTORINIT = 0x007D   # clif_parse_LoadEndAck, 2 bytes
CZ_REQUEST_MOVE = 0x0877       # clif_parse_WalkToXY, 5 bytes
CZ_REQUEST_QUIT = 0x018A       # clif_parse_QuitGame, 4 bytes
ZC_AID = 0x0283                # 6 bytes: header + account id
ZC_ACCEPT_ENTER = 0x02EB
ZC_REFUSE_ENTER = 0x0074
ZC_NOTIFY_PLAYERMOVE = 0x0087

# Length of every char-server packet we might see in this flow. -1 means the
# length is a uint16 at offset 2. Anything not listed stops the parse loudly
# rather than silently desynchronising the stream.
CHAR_PACKET_LEN = {
    HC_ACCEPT_ENTER: -1,
    HC_ACCEPT_ENTER2: -1,
    HC_BLOCK_CHARACTER: -1,
    0x099D: -1,             # HC_ACK_CHARINFO_PER_PAGE
    0x0840: -1,             # HC_NOTIFY_ACCESSIBLE_MAPNAME
    HC_REFUSE_ENTER: 3,
    HC_REFUSE_MAKECHAR: 3,
    SC_NOTIFY_BAN: 3,
    HC_CHARLIST_NOTIFY: 6,
    0x08B9: 12,             # HC_SECOND_PASSWD_LOGIN (pincode state)
    HC_NOTIFY_ZONESVR: 156,
}

LOGIN_ERRORS = {
    0: "unregistered ID",
    1: "incorrect password",
    2: "ID expired",
    3: "rejected by server",
    4: "blocked by the GM team",
    5: "client version does not match the server's packetver",
    6: "banned",
    7: "server is full",
}

# SC_NOTIFY_BAN, src/login/loginclif.cpp logclif_sent_auth_result().
BAN_REASONS = {
    1: "the server is closing",
    2: "someone else logged in with this account",
    8: "the account is still marked online from an earlier session",
}
ALREADY_ONLINE = 8

MAKECHAR_ERRORS = {
    0x00: "that character name is taken",
    0x01: "you are underage (birthdate restriction)",
    0x02: "symbols in the name are forbidden",
    0x03: "you are not eligible to open the character slot",
    0xFF: "character creation denied",
    0xFE: "character creation is turned off on this server",
}


def log(msg):
    print(msg, flush=True)


def ok(msg):
    print(f"  \033[1;32mok\033[0m   {msg}", flush=True)


def die(msg, detail=None):
    print(f"\n\033[1;31m[fail]\033[0m {msg}", file=sys.stderr, flush=True)
    if detail:
        print(detail, file=sys.stderr, flush=True)
    sys.exit(1)


# --- .env ---------------------------------------------------------------------
def read_env(path):
    """Parse .env the way Compose does: everything after the first '=' verbatim,
    one layer of surrounding quotes stripped. Deliberately not exec'd — a valid
    value like BACKUP_CRON=0 */6 * * * would run as a command if it were."""
    values = {}
    if not os.path.isfile(path):
        return values
    with open(path, encoding="utf-8", errors="replace") as handle:
        for line in handle:
            match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line.rstrip("\n"))
            if not match:
                continue
            value = match.group(2)
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[match.group(1)] = value
    return values


# --- coordinate packing -------------------------------------------------------
# rAthena's WBUFPOS/WBUFPOS2 in src/common/socket.hpp. Three bytes carry a
# 10-bit x, a 10-bit y and a 4-bit direction; six bytes carry a from-position,
# a to-position and two 4-bit sub-cell offsets.
def pack_pos(x, y, direction=0):
    return bytes((
        (x >> 2) & 0xFF,
        ((x << 6) | ((y >> 4) & 0x3F)) & 0xFF,
        ((y << 4) | (direction & 0x0F)) & 0xFF,
    ))


def unpack_pos(buf):
    x = (buf[0] << 2) | (buf[1] >> 6)
    y = ((buf[1] & 0x3F) << 4) | (buf[2] >> 4)
    direction = buf[2] & 0x0F
    return x, y, direction


def unpack_pos2(buf):
    x0 = (buf[0] << 2) | (buf[1] >> 6)
    y0 = ((buf[1] & 0x3F) << 4) | (buf[2] >> 4)
    x1 = ((buf[2] & 0x0F) << 6) | (buf[3] >> 2)
    y1 = ((buf[3] & 0x03) << 8) | buf[4]
    return x0, y0, x1, y1


def cstr(raw):
    return raw.split(b"\x00", 1)[0].decode("latin1")


def ipv4(value):
    return ".".join(str((value >> shift) & 0xFF) for shift in (0, 8, 16, 24))


def hexdump(data, limit=256):
    data = data[:limit]
    out = []
    for offset in range(0, len(data), 16):
        chunk = data[offset:offset + 16]
        text = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
        out.append(f"    {offset:04x}  {chunk.hex(' '):<47}  {text}")
    return "\n".join(out)


# --- connection ---------------------------------------------------------------
class Conn:
    """A socket with a receive buffer. Reads are deadline-based rather than
    length-based because the servers push unsolicited packets between the ones
    we asked for, and how many depends on server state."""

    def __init__(self, host, port, label, verbose=False, timeout=10.0):
        self.label = label
        self.verbose = verbose
        try:
            self.sock = socket.create_connection((host, port), timeout=timeout)
        except OSError as exc:
            die(f"cannot connect to the {label}-server at {host}:{port}: {exc}",
                "Is the container running and is the port published?\n"
                "  ./tools/compose.sh ps")
        self.sock.settimeout(0.4)
        self.buf = bytearray()

    def send(self, data):
        if self.verbose:
            log(f"  -> {self.label} {len(data)}B 0x{int.from_bytes(data[:2], 'little'):04x}")
        self.sock.sendall(data)

    def pump(self, seconds):
        """Drain whatever the server has to say for up to `seconds`."""
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                chunk = self.sock.recv(65536)
            except socket.timeout:
                continue
            except OSError as exc:
                raise ConnectionError(f"{self.label}-server: {exc}") from exc
            if not chunk:
                raise ConnectionError(f"{self.label}-server closed the connection")
            self.buf += chunk
            if self.verbose:
                log(f"  <- {self.label} {len(chunk)}B")
        return len(self.buf)

    def wait_for(self, predicate, seconds, what):
        """Poll until predicate(self.buf) returns a truthy value."""
        deadline = time.monotonic() + seconds
        while True:
            found = predicate(self.buf)
            if found:
                return found
            if time.monotonic() >= deadline:
                die(f"timed out waiting for {what} from the {self.label}-server",
                    f"  received {len(self.buf)} bytes:\n{hexdump(self.buf)}")
            try:
                chunk = self.sock.recv(65536)
            except socket.timeout:
                continue
            except OSError as exc:
                die(f"{self.label}-server: {exc}")
            if not chunk:
                die(f"the {self.label}-server closed the connection while we waited for {what}",
                    f"  received {len(self.buf)} bytes:\n{hexdump(self.buf)}"
                    "\n\n  A close right here usually means the server rejected the"
                    "\n  handshake. Check its log: ./tools/compose.sh logs "
                    f"{self.label}")
            self.buf += chunk

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


def scan_packets(buf, lengths, wanted):
    """Walk the buffer packet by packet and return the first packet whose id is
    in `wanted`. Returns None while the buffer is short; raises on an id we have
    no length for, because guessing would desynchronise everything after it.

    A wanted id is matched before its length is looked up, so a packet we only
    ever need to *find* — never to skip past — does not need a table entry.
    HC_ACCEPT_MAKECHAR is the case that matters: it carries a CHARACTER_INFO
    whose size moves with packetver, and getting that wrong would be a silent
    off-by-eight rather than an error."""
    offset = 0
    while offset + 2 <= len(buf):
        pid = int.from_bytes(buf[offset:offset + 2], "little")
        if pid in wanted:
            size = lengths.get(pid, 2)
            if size == -1:
                if offset + 4 > len(buf):
                    return None
                size = int.from_bytes(buf[offset + 2:offset + 4], "little")
            return pid, bytes(buf[offset:offset + max(size, 2)])
        if pid not in lengths:
            raise KeyError(
                f"unknown packet 0x{pid:04x} at offset {offset}. "
                "The packetver in .env probably does not match the one this "
                "script was written for."
            )
        size = lengths[pid]
        if size == -1:
            if offset + 4 > len(buf):
                return None
            size = int.from_bytes(buf[offset + 2:offset + 4], "little")
            if size < 4:
                raise ValueError(f"packet 0x{pid:04x} claims length {size}")
        if offset + size > len(buf):
            return None
        offset += size
    return None


def expect_char_id(buf):
    """The char-server's first reply is four raw bytes — the account id, with no
    packet header at all. Every RO parser has to special-case this, and one that
    does not will desynchronise on the very first read."""
    return int.from_bytes(buf[:4], "little") if len(buf) >= 4 else None


def expect_map_id(buf):
    """The map-server announces the same thing, but wrapped. src/map/clif.cpp:

        #if PACKETVER < 20070521
            WFIFOL(fd,0) = sd->id;          // four raw bytes, like the char-server
        #else
            WFIFOW(fd,0) = 0x283;           // header, then the id
            WFIFOL(fd,2) = sd->id;

    Ours is well past that cutoff, so it is 0x0283. The bare-four-bytes branch is
    still handled: it costs two lines and it is what an older packetver sends."""
    if len(buf) >= 2 and int.from_bytes(buf[:2], "little") == ZC_AID:
        if len(buf) < 6:
            return None
        return int.from_bytes(buf[2:6], "little"), 6
    if len(buf) >= 4:
        return int.from_bytes(buf[:4], "little"), 4
    return None


# --- stages -------------------------------------------------------------------
def stage_login(host, port, user, password, packetver, verbose):
    log("\n\033[1;36m1. login-server\033[0m")
    conn = Conn(host, port, "login", verbose)

    packet = (
        CA_LOGIN.to_bytes(2, "little")
        + packetver.to_bytes(4, "little")
        + user.encode("latin1").ljust(24, b"\x00")[:24]
        + password.encode("latin1").ljust(24, b"\x00")[:24]
        + b"\x00"
    )
    assert len(packet) == 55, len(packet)
    conn.send(packet)

    def seen(buf):
        if len(buf) < 3:
            return None
        pid = int.from_bytes(buf[0:2], "little")
        if pid == SC_NOTIFY_BAN:
            return ("banned", bytes(buf[:3]))
        if len(buf) < 4:
            return None
        if pid == AC_REFUSE_LOGIN:
            return ("refused", bytes(buf[:23])) if len(buf) >= 23 else None
        if pid == AC_ACCEPT_LOGIN:
            size = int.from_bytes(buf[2:4], "little")
            return ("accepted", bytes(buf[:size])) if len(buf) >= size else None
        die(f"the login-server answered with 0x{pid:04x}, which is none of "
            "accept (0x0ac4), refuse (0x083e) or ban (0x0081)",
            hexdump(buf))

    kind, data = conn.wait_for(seen, 10.0, "a login response")

    if kind == "banned":
        code = data[2]
        conn.close()
        return None, (code, BAN_REASONS.get(code, f"ban code {code}"))

    if kind == "refused":
        code = int.from_bytes(data[2:6], "little")
        conn.close()
        return None, (None, LOGIN_ERRORS.get(code, f"error {code}"))

    # PACKETVER >= 20170315 layout, src/common/packets.hpp:
    #   type 2, length 2, login_id1 4, AID 4, login_id2 4, last_ip 4,
    #   last_login 26, sex 1, token 17, then 160 bytes per char-server.
    header = 2 + 2 + 4 + 4 + 4 + 4 + 26 + 1 + 17
    login_id1 = int.from_bytes(data[4:8], "little")
    account_id = int.from_bytes(data[8:12], "little")
    login_id2 = int.from_bytes(data[12:16], "little")
    sex = data[46]                       # after last_ip (16..19) and last_login[26]

    servers = []
    body = data[header:]
    while len(body) >= 160:
        servers.append({
            "ip": ipv4(int.from_bytes(body[0:4], "little")),
            "port": int.from_bytes(body[4:6], "little"),
            "name": cstr(body[6:26]),
            "users": int.from_bytes(body[26:28], "little"),
        })
        body = body[160:]
    conn.close()

    if not servers:
        die("the login-server accepted us but advertised no char-server",
            "  The char-server has not registered. Check RO_INTER_USER /\n"
            "  RO_INTER_PASS agree between .env and the `login` table:\n"
            "  ./tools/db-init.sh")

    ok(f"authenticated as '{user}' (account {account_id}, sex {'M' if sex else 'F'})")
    for srv in servers:
        ok(f"char-server advertised: '{srv['name']}' at {srv['ip']}:{srv['port']} "
           f"({srv['users']} online)")

    return {
        "account_id": account_id,
        "login_id1": login_id1,
        "login_id2": login_id2,
        "sex": sex,
        "servers": servers,
    }, None


def stage_char(host, port, auth, char_name, slot, verbose):
    log("\n\033[1;36m2. char-server\033[0m")
    conn = Conn(host, port, "char", verbose)

    conn.send(
        CH_ENTER.to_bytes(2, "little")
        + auth["account_id"].to_bytes(4, "little")
        + auth["login_id1"].to_bytes(4, "little")
        + auth["login_id2"].to_bytes(4, "little")
        + b"\x00\x00"
        + bytes((auth["sex"],))
    )

    echoed = conn.wait_for(expect_char_id, 10.0, "the account-id echo")
    if echoed != auth["account_id"]:
        die(f"the char-server echoed account {echoed}, not {auth['account_id']}",
            hexdump(conn.buf))
    del conn.buf[:4]
    ok("account-id echo matches")

    def char_list(buf):
        try:
            return scan_packets(buf, CHAR_PACKET_LEN,
                                {HC_ACCEPT_ENTER, HC_REFUSE_ENTER, SC_NOTIFY_BAN})
        except (KeyError, ValueError) as exc:
            die(str(exc), hexdump(buf))

    pid, data = conn.wait_for(char_list, 15.0, "the character list")
    if pid != HC_ACCEPT_ENTER:
        die(f"the char-server refused us (0x{pid:04x}, code {data[2]})",
            "  Code 8 means the account is still marked online from a previous\n"
            "  run. Wait for the session to time out, or restart the char-server.")

    # 2 type + 2 length + 3 slot counters + 20 extension, then the characters.
    body_len = int.from_bytes(data[2:4], "little") - 27
    has_character = body_len > 0
    ok(f"character list received ({'occupied' if has_character else 'empty'})")

    if not has_character:
        conn.send(
            CH_MAKE_CHAR.to_bytes(2, "little")
            + char_name.encode("latin1").ljust(24, b"\x00")[:24]
            + bytes((slot,))
            + (1).to_bytes(2, "little")     # hair colour
            + (1).to_bytes(2, "little")     # hair style
            + (0).to_bytes(4, "little")     # job: Novice
            + bytes((auth["sex"],))
        )

        def made(buf):
            try:
                return scan_packets(buf, CHAR_PACKET_LEN,
                                    {HC_ACCEPT_MAKECHAR, HC_REFUSE_MAKECHAR})
            except (KeyError, ValueError) as exc:
                die(str(exc), hexdump(buf))

        pid, data = conn.wait_for(made, 15.0, "the character-creation result")
        if pid == HC_REFUSE_MAKECHAR:
            code = data[2] if len(data) >= 3 else 0xFF
            die(f"character creation refused: {MAKECHAR_ERRORS.get(code, f'code {code}')}")
        ok(f"created '{char_name}' in slot {slot} (Novice)")
    else:
        ok(f"reusing the character already in slot {slot}")

    # Let the char-server finish whatever it is still sending, then start from
    # an empty buffer. Otherwise the reply to CH_SELECT_CHAR arrives behind a
    # HC_ACCEPT_MAKECHAR whose length we deliberately do not know, and the
    # parser cannot step over it.
    conn.pump(1.5)
    conn.buf.clear()

    conn.send(CH_SELECT_CHAR.to_bytes(2, "little") + bytes((slot,)))

    def zone(buf):
        try:
            return scan_packets(buf, CHAR_PACKET_LEN,
                                {HC_NOTIFY_ZONESVR, HC_REFUSE_ENTER})
        except (KeyError, ValueError) as exc:
            die(str(exc), hexdump(buf))

    pid, data = conn.wait_for(zone, 15.0, "the map-server handoff (0x0ac5)")
    if pid == HC_REFUSE_ENTER:
        die(f"char-select refused, code {data[2]}",
            "  Code 0 is the generic rejection; check the char-server log.")
    result = {
        "char_id": int.from_bytes(data[2:6], "little"),
        "map": cstr(data[6:22]),
        "ip": ipv4(int.from_bytes(data[22:26], "little")),
        "port": int.from_bytes(data[26:28], "little"),
    }
    conn.close()
    ok(f"character {result['char_id']} selected, starting on {result['map']}")
    ok(f"map-server advertised: {result['ip']}:{result['port']}")
    return result


def stage_map(host, port, auth, zone, verbose):
    log("\n\033[1;36m3. map-server\033[0m")
    conn = Conn(host, port, "map", verbose)

    conn.send(
        CZ_ENTER.to_bytes(2, "little")
        + auth["account_id"].to_bytes(4, "little")
        + zone["char_id"].to_bytes(4, "little")
        + auth["login_id1"].to_bytes(4, "little")
        + int(time.time() * 1000 % 0x7FFFFFFF).to_bytes(4, "little")
        + bytes((auth["sex"],))
    )

    echoed, consumed = conn.wait_for(expect_map_id, 10.0, "the account-id echo")
    if echoed != auth["account_id"]:
        die(f"the map-server echoed account {echoed}, not {auth['account_id']}",
            hexdump(conn.buf))
    del conn.buf[:consumed]
    ok("account-id echo matches")

    # ZC_ACCEPT_ENTER is 13 bytes: type 2, startTime 4, posDir 3, xSize 1,
    # ySize 1, font 2. It is the first real packet, so no scanning needed.
    def accepted(buf):
        if len(buf) >= 3 and int.from_bytes(buf[0:2], "little") == ZC_REFUSE_ENTER:
            die(f"the map-server refused entry, code {buf[2]}")
        if len(buf) < 13:
            return None
        pid = int.from_bytes(buf[0:2], "little")
        if pid != ZC_ACCEPT_ENTER:
            die(f"expected ZC_ACCEPT_ENTER (0x02eb), got 0x{pid:04x}", hexdump(buf))
        return bytes(buf[:13])

    data = conn.wait_for(accepted, 20.0, "ZC_ACCEPT_ENTER")
    x, y, direction = unpack_pos(data[6:9])
    del conn.buf[:13]
    ok(f"entered {zone['map']} at ({x}, {y}) facing {direction}")

    # The client tells the server it has finished loading the map. Without it
    # the server treats the player as still loading and drops movement.
    conn.send(CZ_NOTIFY_ACTORINIT.to_bytes(2, "little"))
    conn.pump(2.0)
    ok(f"map data received ({len(conn.buf)} bytes of world state)")
    conn.buf.clear()

    target = (x + 3, y)
    conn.send(CZ_REQUEST_MOVE.to_bytes(2, "little") + pack_pos(*target))

    # ZC_NOTIFY_PLAYERMOVE is 12 bytes: type 2, moveStartTime 4, moveData 6.
    # We scan for it rather than parsing the whole world-state stream, and
    # confirm it is ours by checking the packed from/to against what we asked
    # for. A coincidental 0x0087 that also encodes our exact coordinates is not
    # a thing that happens.
    def walked(buf):
        for offset in range(0, max(0, len(buf) - 11)):
            if int.from_bytes(buf[offset:offset + 2], "little") != ZC_NOTIFY_PLAYERMOVE:
                continue
            x0, y0, x1, y1 = unpack_pos2(buf[offset + 6:offset + 12])
            if (x0, y0) == (x, y) and (x1, y1) == target:
                return (x0, y0, x1, y1)
        return None

    moved = conn.wait_for(walked, 15.0,
                          f"a movement acknowledgement to {target}")
    ok(f"walked ({moved[0]}, {moved[1]}) -> ({moved[2]}, {moved[3]})")

    # Log out cleanly. Without this the character stays flagged online and the
    # next run is refused with "already logged in" until the session times out.
    # The server closes the socket in reply, so a disconnect here is success.
    conn.send(CZ_REQUEST_QUIT.to_bytes(2, "little") + b"\x00\x00")
    try:
        conn.pump(1.5)
    except ConnectionError:
        pass
    conn.close()
    ok("logged out")
    return {"map": zone["map"], "from": (x, y), "to": target}


def login_with_retries(args, login_port, packetver):
    """Log in, creating the account and waiting out a stale session if needed.

    Two refusals are not failures:

    * "unregistered ID" on the first ever run. `new_account: yes` means a _M
      suffix creates the account and authenticates in the same exchange.
    * "still marked online" after a run that died mid-session — including a
      failed run of this script. rAthena does not simply refuse: it broadcasts
      a kick (0x2734) to every char-server and arms a 30-second AUTH_TIMEOUT,
      so the right response is to wait and ask again. A real player retrying
      after "Server still recognizes your last login" is doing the same thing.
    """
    attempt_user = args.user
    for attempt in range(4):
        auth, refusal = stage_login(args.host, login_port, attempt_user,
                                    args.password, packetver, args.verbose)
        if auth:
            return auth

        code, reason = refusal
        if code == ALREADY_ONLINE and attempt < 3:
            delay = 8 * (attempt + 1)
            log(f"  {reason}")
            log(f"  rAthena has kicked it; waiting {delay}s and trying again")
            time.sleep(delay)
            continue
        if reason == LOGIN_ERRORS[0] and attempt_user == args.user:
            log(f"  login refused ({reason}) — creating the account")
            attempt_user = args.user + "_M"
            continue
        die(f"login failed: {reason}",
            "  'client version does not match' means PACKETVER in .env and the\n"
            "  compiled server disagree — rebuild with rebuild=true.\n"
            "  'unregistered ID' means new_account is off in login_athena.conf.\n"
            "  'still marked online' that outlasts 30s means a session is stuck:\n"
            "  VPS ops -> restart, service char.")
    die("login kept being refused because the account is still marked online",
        "  Something is holding the session open. VPS ops -> restart, service char.")


def main():
    parser = argparse.ArgumentParser(
        description="Log in, create a character and walk it, over the real protocol.")
    parser.add_argument("--host", default="127.0.0.1",
                        help="where to connect (default: loopback, so the game "
                             "ports never have to be opened to the internet)")
    parser.add_argument("--user", default=os.environ.get("SMOKE_USER", "smoketest"),
                        help="account to use; created on first run")
    parser.add_argument("--password", default=os.environ.get("SMOKE_PASS", "smoketest"))
    parser.add_argument("--char-name", default=os.environ.get("SMOKE_CHAR", "SmokeTest"))
    parser.add_argument("--slot", type=int, default=0)
    parser.add_argument("--env", default=".env")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = read_env(os.path.join(root, args.env))

    packetver = int(env.get("PACKETVER", EXPECTED_PACKETVER))
    login_port = int(env.get("LOGIN_PORT", 6900))
    char_port = int(env.get("CHAR_PORT", 6121))
    map_port = int(env.get("MAP1_PORT", 5121))
    advertise = env.get("RO_ADVERTISE_IP", "")

    log("\033[1mPhase 1 smoke test — login, create a character, walk\033[0m")
    log(f"  host {args.host}  ports {login_port}/{char_port}/{map_port}  "
        f"packetver {packetver}")

    if packetver != EXPECTED_PACKETVER:
        log(f"\n  \033[1;33mnote\033[0m PACKETVER is {packetver} but the packet ids in "
            f"this script were read\n       out of rAthena for {EXPECTED_PACKETVER}. "
            "They are shuffled per version,\n       so a mismatch here is a real "
            "problem, not a warning to ignore.")

    auth = login_with_retries(args, login_port, packetver)

    # The addresses the servers hand out are what a real client would dial.
    # We deliberately connect to --host instead, so this works with the game
    # ports closed, but a wrong advertisement is the single most common reason
    # a real client reaches character select and then hangs — so check it.
    advertised = {srv["ip"] for srv in auth["servers"]}
    if advertise and advertised != {advertise}:
        log(f"\n  \033[1;33mnote\033[0m the login-server advertises the char-server at "
            f"{', '.join(sorted(advertised))},\n       but RO_ADVERTISE_IP is "
            f"{advertise}. A real client would follow the advertisement.")

    zone = stage_char(args.host, char_port, auth, args.char_name, args.slot,
                      args.verbose)
    if advertise and zone["ip"] != advertise:
        log(f"\n  \033[1;33mnote\033[0m the char-server advertises the map-server at "
            f"{zone['ip']}, but\n       RO_ADVERTISE_IP is {advertise}.")

    result = stage_map(args.host, zone["port"] if zone["port"] else map_port,
                       auth, zone, args.verbose)

    log("\n\033[1;32mPhase 1 gate: login, character creation and movement all "
        "work.\033[0m")
    log(f"  account   {args.user} ({auth['account_id']})")
    log(f"  character {zone['char_id']} on {result['map']}")
    log(f"  walked    {result['from']} -> {result['to']}")
    log("\n  This proves the server side only. The gate also wants a real PC")
    log("  client, which additionally exercises the GRF and the sprites.")


if __name__ == "__main__":
    try:
        main()
    except ConnectionError as exc:
        die(str(exc))
    except KeyboardInterrupt:
        sys.exit(130)
