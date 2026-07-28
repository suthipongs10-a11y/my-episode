#!/usr/bin/env python3
# =============================================================================
# Self-test for tools/smoke-play.py
# =============================================================================
#   ./tools/test-smoke-play.py
#
# Stands up mock login/char/map servers that reproduce rAthena's 20180620 wire
# format, then runs the real smoke client against them.
#
# Why bother testing a test: smoke-play.py is the thing that will tell us the
# server is healthy, and its packet ids and field offsets are hand-derived from
# rAthena source. A wrong offset does not throw — it reads a plausible number
# from the wrong place and reports success. This is what stops that.
#
# It also pins the byte layout. When PACKETVER moves, this fails first and
# concretely, instead of the deploy failing later and vaguely.
# =============================================================================

import os
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SMOKE = os.path.join(ROOT, "tools", "smoke-play.py")

HOST = "127.0.0.1"
AID, LID1, LID2, CID = 2000042, 111111, 222222, 150007
SEX = 1
MAP_NAME = "new_1-1.gat"
START_X, START_Y = 53, 111

failures = []


def check(condition, message):
    if condition:
        print(f"  \033[1;32mok\033[0m   {message}")
    else:
        print(f"  \033[1;31mfail\033[0m {message}")
        failures.append(message)


def ip_bytes(text):
    # rAthena writes htonl(ip), so the wire carries the dotted quad in order.
    return struct.pack("!4B", *(int(part) for part in text.split(".")))


def recvn(conn, count):
    buf = b""
    while len(buf) < count:
        chunk = conn.recv(count - len(buf))
        if not chunk:
            raise ConnectionError("client closed")
        buf += chunk
    return buf


class MockServers:
    """One login, one char and one map server on ephemeral ports."""

    def __init__(self, *, account_exists=True, has_character=False,
                 always_refuse=False):
        self.account_exists = account_exists
        self.has_character = has_character
        self.always_refuse = always_refuse
        self.seen = []
        self.socks = {}
        self.ports = {}
        for role in ("login", "char", "map"):
            sock = socket.socket()
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((HOST, 0))
            sock.listen(4)
            self.socks[role] = sock
            self.ports[role] = sock.getsockname()[1]

    def start(self):
        for role, handler in (("login", self._login), ("char", self._char),
                              ("map", self._map)):
            threading.Thread(target=self._accept, args=(role, handler),
                             daemon=True).start()
        return self

    def _accept(self, role, handler):
        sock = self.socks[role]
        while True:
            try:
                conn, _ = sock.accept()
            except OSError:
                return
            threading.Thread(target=self._guard, args=(handler, conn),
                             daemon=True).start()

    def _guard(self, handler, conn):
        try:
            handler(conn)
        except (ConnectionError, OSError, AssertionError) as exc:
            self.seen.append(("error", repr(exc)))
        finally:
            time.sleep(0.2)
            try:
                conn.close()
            except OSError:
                pass

    def stop(self):
        for sock in self.socks.values():
            try:
                sock.close()
            except OSError:
                pass

    # --- login ---------------------------------------------------------------
    def _login(self, conn):
        packet = recvn(conn, 55)
        assert int.from_bytes(packet[0:2], "little") == 0x0064
        user = packet[6:30].split(b"\x00")[0].decode()
        self.seen.append(("login", user, int.from_bytes(packet[2:6], "little")))

        creating = user.endswith("_M") or user.endswith("_F")
        if self.always_refuse:
            # Error 1 = incorrect password, which is also what rAthena returns
            # when an _M creation collides with an existing account.
            conn.sendall(struct.pack("<HI", 0x083E, 1) + b"\x00" * 20)
            return
        if not self.account_exists and not creating:
            # AC_REFUSE_LOGIN: type 2, error 4, unblock_time 20.
            conn.sendall(struct.pack("<HI", 0x083E, 0) + b"\x00" * 20)
            return
        self.account_exists = True

        char_server = (
            ip_bytes(HOST)
            + struct.pack("<H", self.ports["char"])
            + b"MockServer".ljust(20, b"\x00")
            + struct.pack("<HHH", 7, 0, 0)
            + b"\x00" * 128
        )
        assert len(char_server) == 160, len(char_server)

        body = (
            struct.pack("<IIII", LID1, AID, LID2, 0)
            + b"".ljust(26, b"\x00")
            + bytes((SEX,))
            + b"".ljust(17, b"\x00")
        )
        assert len(body) == 60, len(body)
        conn.sendall(struct.pack("<HH", 0x0AC4, 4 + len(body) + len(char_server))
                     + body + char_server)

    # --- char ----------------------------------------------------------------
    def _char(self, conn):
        packet = recvn(conn, 17)
        assert int.from_bytes(packet[0:2], "little") == 0x0065
        assert int.from_bytes(packet[2:6], "little") == AID
        assert int.from_bytes(packet[6:10], "little") == LID1
        assert int.from_bytes(packet[10:14], "little") == LID2
        self.seen.append(("char-enter", packet[16]))

        conn.sendall(struct.pack("<I", AID))
        time.sleep(0.05)
        self._send_char_list(conn)

        while True:
            pid = int.from_bytes(recvn(conn, 2), "little")
            if pid == 0x0A39:                                  # CH_MAKE_CHAR
                rest = recvn(conn, 34)
                self.seen.append((
                    "make-char",
                    rest[0:24].split(b"\x00")[0].decode(),
                    rest[24],                                  # slot
                    int.from_bytes(rest[29:33], "little"),     # job
                    rest[33],                                  # sex
                ))
                self.has_character = True
                conn.sendall(struct.pack("<H", 0x006D) + b"\x22" * 147)
                time.sleep(0.05)
                conn.sendall(struct.pack("<HI", 0x09A0, 5))
            elif pid == 0x0066:                                # CH_SELECT_CHAR
                slot = recvn(conn, 1)[0]
                self.seen.append(("select", slot))
                conn.sendall(
                    struct.pack("<HI", 0x0AC5, CID)
                    + MAP_NAME.encode().ljust(16, b"\x00")
                    + ip_bytes(HOST)
                    + struct.pack("<H", self.ports["map"])
                    + b"\x00" * 128
                )
            else:
                self.seen.append(("char-unexpected", hex(pid)))
                return

    def _send_char_list(self, conn):
        # The real order: 0x082d, 0x006b, 0x09a0, 0x020d.
        conn.sendall(struct.pack("<HHBBBBB", 0x082D, 29, 3, 0, 0, 9, 15)
                     + b"\x00" * 20)
        chars = b"\x11" * 147 if self.has_character else b""
        conn.sendall(struct.pack("<HHBBB", 0x006B, 27 + len(chars), 15, 3, 3)
                     + b"\x00" * 20 + chars)
        conn.sendall(struct.pack("<HI", 0x09A0, 5))
        conn.sendall(struct.pack("<HH", 0x020D, 4))

    # --- map -----------------------------------------------------------------
    def _map(self, conn):
        packet = recvn(conn, 19)
        assert int.from_bytes(packet[0:2], "little") == 0x0888
        assert int.from_bytes(packet[2:6], "little") == AID
        assert int.from_bytes(packet[6:10], "little") == CID
        self.seen.append(("map-enter", int.from_bytes(packet[10:14], "little")))

        conn.sendall(struct.pack("<I", AID))
        time.sleep(0.05)

        pos = bytes((
            (START_X >> 2) & 0xFF,
            ((START_X << 6) | ((START_Y >> 4) & 0x3F)) & 0xFF,
            ((START_Y << 4) | 4) & 0xFF,
        ))
        conn.sendall(struct.pack("<HI", 0x02EB, 12345) + pos + b"\x05\x05"
                     + b"\x00\x00")

        while True:
            pid = int.from_bytes(recvn(conn, 2), "little")
            if pid == 0x007D:                                  # LoadEndAck
                self.seen.append(("loadend",))
                conn.sendall(b"\x99" * 800)                    # world state noise
            elif pid == 0x0437:                                # WalkToXY
                raw = recvn(conn, 3)
                dest_x = (raw[0] << 2) | (raw[1] >> 6)
                dest_y = ((raw[1] & 0x3F) << 4) | (raw[2] >> 4)
                self.seen.append(("walk", dest_x, dest_y))
                move = bytes((
                    (START_X >> 2) & 0xFF,
                    ((START_X << 6) | ((START_Y >> 4) & 0x3F)) & 0xFF,
                    ((START_Y << 4) | (dest_x >> 6)) & 0xFF,
                    ((dest_x << 2) | (dest_y >> 8)) & 0xFF,
                    dest_y & 0xFF,
                    0x88,
                ))
                # Prefixed with noise so the scan has to actually find it.
                conn.sendall(b"\x77" * 40 + struct.pack("<HI", 0x0087, 999) + move)
            elif pid == 0x018A:                                # QuitGame
                recvn(conn, 2)
                self.seen.append(("quit",))
                return
            else:
                self.seen.append(("map-unexpected", hex(pid)))
                return


def run_smoke(servers, user="tester", extra=()):
    with tempfile.NamedTemporaryFile("w", suffix=".env", dir=ROOT,
                                     delete=False) as handle:
        handle.write(
            "PACKETVER=20180620\n"
            f"LOGIN_PORT={servers.ports['login']}\n"
            f"CHAR_PORT={servers.ports['char']}\n"
            f"MAP1_PORT={servers.ports['map']}\n"
            f"RO_ADVERTISE_IP={HOST}\n"
        )
        env_path = handle.name
    try:
        return subprocess.run(
            [sys.executable, SMOKE,
             "--env", os.path.basename(env_path),
             "--user", user, "--password", "testpass",
             "--char-name", "MockHero", *extra],
            capture_output=True, text=True, timeout=120, cwd=ROOT,
        )
    finally:
        os.unlink(env_path)


def case_fresh_account():
    print("\nan account and a character that do not exist yet:")
    servers = MockServers(account_exists=False, has_character=False).start()
    try:
        result = run_smoke(servers)
    finally:
        servers.stop()

    check(result.returncode == 0,
          f"smoke-play exits 0 (got {result.returncode})")
    logins = [row for row in servers.seen if row[0] == "login"]
    check([row[1] for row in logins] == ["tester", "tester_M"],
          "an unknown account is retried with the _M suffix that creates it")
    check(all(row[2] == 20180620 for row in logins),
          "CA_LOGIN carries the packetver from .env")

    made = [row for row in servers.seen if row[0] == "make-char"]
    check(len(made) == 1, "exactly one character is created")
    if made:
        check(made[0][1:] == ("MockHero", 0, 0, SEX),
              "CH_MAKE_CHAR carries name, slot 0, job Novice and the account's sex")
    check(("select", 0) in servers.seen, "slot 0 is selected")
    check(("map-enter", LID1) in servers.seen,
          "CZ_ENTER carries login_id1 from the login-server")
    check(("loadend",) in servers.seen, "the map load is acknowledged")
    check(("walk", START_X + 3, START_Y) in servers.seen,
          "the walk targets three cells east of the spawn point")
    check(("quit",) in servers.seen, "the session is closed cleanly")
    check("Phase 1 gate" in result.stdout, "the gate is reported as passed")
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)


def case_existing_character():
    print("\nan account whose slot 0 is already occupied:")
    servers = MockServers(account_exists=True, has_character=True).start()
    try:
        result = run_smoke(servers)
    finally:
        servers.stop()

    check(result.returncode == 0,
          f"smoke-play exits 0 (got {result.returncode})")
    check(not [row for row in servers.seen if row[0] == "make-char"],
          "no second character is created")
    check("reusing the character" in result.stdout,
          "the existing character is reused, so the test is re-runnable")
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)


def case_wrong_password():
    print("\nan account that stays refused:")
    # The _M retry is refused too, which is what happens when the password is
    # simply wrong for an account that already exists.
    servers = MockServers(always_refuse=True).start()
    try:
        result = run_smoke(servers)
    finally:
        servers.stop()

    check(result.returncode != 0, "a refused login fails the run")
    check("incorrect password" in result.stderr,
          "the refusal code is translated to something readable")


def case_packetver_mismatch_is_loud():
    print("\na packetver the script was not written for:")
    servers = MockServers(account_exists=True, has_character=True).start()
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".env", dir=ROOT,
                                         delete=False) as handle:
            handle.write(
                "PACKETVER=20211103\n"
                f"LOGIN_PORT={servers.ports['login']}\n"
                f"CHAR_PORT={servers.ports['char']}\n"
                f"MAP1_PORT={servers.ports['map']}\n"
            )
            env_path = handle.name
        try:
            result = subprocess.run(
                [sys.executable, SMOKE, "--env", os.path.basename(env_path)],
                capture_output=True, text=True, timeout=120, cwd=ROOT)
        finally:
            os.unlink(env_path)
    finally:
        servers.stop()

    check("20211103" in result.stdout and "shuffled" in result.stdout,
          "a packetver mismatch is called out rather than silently assumed")


def main():
    print("\033[1msmoke-play.py against mock rAthena servers\033[0m")
    case_fresh_account()
    case_existing_character()
    case_wrong_password()
    case_packetver_mismatch_is_loud()

    print()
    if failures:
        print(f"\033[1;31m{len(failures)} check(s) failed\033[0m")
        return 1
    print("\033[1;32mall checks passed\033[0m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
