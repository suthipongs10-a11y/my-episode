#!/usr/bin/env python3
# =============================================================================
# client-doctor — what does this ragexe want, and is it actually there?
# =============================================================================
#   python client-doctor.py "C:\Games\CleanTest"
#   python client-doctor.py "C:\Games\CleanTest" --list-missing-only
#
# Run this on the machine that has the client. Standard library only, no
# install, works offline.
#
# WHY THIS EXISTS
#
# docs/phase-1-client.md records that Process Monitor showed 707 NAME NOT FOUND
# events and "not one game file", and concluded nothing is missing. That
# conclusion is wider than the evidence: **ProcMon cannot see inside a GRF.**
# It observes `data.grf` being opened once; every lookup after that happens in
# memory, inside the client. A file the client needs from inside the archive can
# be absent and ProcMon will show nothing at all.
#
# So this reads the GRF file table directly, the same way roBrowser's
# Loaders/GameFile.js does, and answers the question ProcMon could not:
# for every file this executable asks for by name, is it reachable — as a loose
# file, or as an entry in one of the GRFs?
#
# It also reports the two things most likely to produce a silent failure:
# encrypted GRF entries, and a msgstringtable.txt too short to hold the index of
# the error the client is trying to report.
# =============================================================================
import argparse
import re
import struct
import sys
import zlib
from pathlib import Path

# --- what the client asks for, read straight out of the binary ---------------
# The decisive technique from docs/phase-1-client.md: every path and manager
# name the client needs is a plain string in the executable.
LUA_RE = re.compile(rb"[A-Za-z0-9_./\\\- ]{3,80}\.(?:lub|lua)", re.IGNORECASE)
MGR_RE = re.compile(rb"C[A-Za-z]{3,30}Mgr")
INFO_RE = re.compile(rb"s?clientinfo\.xml", re.IGNORECASE)

GRF_SIG = b"Master of Magic"
GRF_SIG_EH3 = b"Event Horizon"
HEADER_SIZE = 46  # signature[15] + key[15] + u32 offset + u32 skip + u32 count + u32 version

TYPE_FILE = 0x01
TYPE_ENCRYPT_MIXED = 0x02
TYPE_ENCRYPT_HEADER = 0x04


def norm(path: str) -> str:
    """One spelling for a game path. The client is case-insensitive and mixes
    separators freely — 'System/Towninfo.lub' and 'system\\towninfo.lub' are the
    same file, and treating them as different is how you 'lose' a file that is
    right there."""
    return path.replace("\\", "/").lstrip("./").lower()


# --- GRF ---------------------------------------------------------------------
class GrfError(Exception):
    pass


def read_grf_entries(path: Path):
    """Return (entries, version). entries maps normalised name -> type byte.

    Format per roBrowser src/Loaders/GameFile.js. Only the file table is read;
    no entry contents are decompressed, so this stays fast on a 4GB archive.
    """
    with path.open("rb") as fp:
        head = fp.read(HEADER_SIZE)
        if len(head) < HEADER_SIZE:
            raise GrfError("file is shorter than a GRF header")

        signature = head[:15].split(b"\0")[0]
        if signature not in (GRF_SIG, GRF_SIG_EH3):
            raise GrfError(f"bad signature {signature!r} — not a GRF")

        table_offset, skip, filecount, version = struct.unpack("<IIII", head[30:46])

        if version == 0x300:
            fp.seek(30)
            table_offset = struct.unpack("<Q", fp.read(8))[0]
            realcount = struct.unpack("<I", fp.read(4))[0]
            table_at = table_offset + HEADER_SIZE + 4
        elif version == 0x200:
            realcount = filecount - skip - 7
            table_at = table_offset + HEADER_SIZE
        else:
            raise GrfError(f"unsupported version 0x{version:x} (only 0x200 and 0x300)")

        if realcount < 0:
            raise GrfError("file table count is negative — header is corrupt")

        fp.seek(table_at)
        pack_size, real_size = struct.unpack("<II", fp.read(8))
        table = zlib.decompress(fp.read(pack_size))
        if len(table) != real_size:
            raise GrfError(f"file table inflated to {len(table)}, header said {real_size}")

    entries = {}
    pos = 0
    for _ in range(realcount):
        end = table.index(b"\0", pos)
        name = table[pos:end].decode("latin-1")
        pos = end + 1
        # pack_size, length_aligned, real_size, type, offset
        _, _, _, etype = struct.unpack_from("<IIIB", table, pos)
        pos += 13
        pos += 8 if version == 0x300 else 4
        entries[norm(name)] = etype

    return entries, version


# --- report ------------------------------------------------------------------
class Report:
    def __init__(self):
        self.problems = 0

    def head(self, text):
        print(f"\n== {text}")

    def ok(self, text):
        print(f"  ok    {text}")

    def warn(self, text):
        print(f"  warn  {text}")

    def bad(self, text):
        print(f"  FAIL  {text}")
        self.problems += 1

    def info(self, text):
        print(f"        {text}")


def find_exes(root: Path):
    return sorted(p for p in root.glob("*.exe") if p.stat().st_size > 512 * 1024)


def main():
    ap = argparse.ArgumentParser(description="Diagnose a Ragnarok client folder.")
    ap.add_argument("folder", help="the client folder (contains the .exe and the GRFs)")
    ap.add_argument("--exe", help="which executable to read (default: every .exe found)")
    ap.add_argument("--list-missing-only", action="store_true",
                    help="print only the files the client wants and cannot reach")
    args = ap.parse_args()

    root = Path(args.folder)
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 2

    r = Report()
    print(f"client folder: {root}")

    # --- 1. the archives -----------------------------------------------------
    # DATA.INI names the archives and their load order. It is the classic
    # "file is present but its contents are wrong" failure: the client finds
    # DATA.INI, reads a GRF name out of it that does not exist, and gives up.
    # ProcMon cannot flag this as a missing game file because the name it looked
    # for came from a file it successfully opened.
    r.head("DATA.INI")
    data_ini = next((p for p in root.iterdir()
                     if p.is_file() and p.name.lower() == "data.ini"), None)
    declared = []
    if not data_ini:
        r.warn("no DATA.INI — the client falls back to its built-in default list")
    else:
        for line in data_ini.read_bytes().decode("latin-1").splitlines():
            line = line.strip()
            if "=" in line and not line.startswith(("[", ";", "#", "//")):
                value = line.split("=", 1)[1].strip()
                if value.lower().endswith((".grf", ".gpf")):
                    declared.append(value)
        if not declared:
            r.warn(f"{data_ini.name} declares no GRF")
        for name in declared:
            if (root / name).is_file():
                r.ok(f"{name} declared and present")
            else:
                r.bad(f"{name} is declared in DATA.INI but the file does not exist")
                r.info("the client stops here; either add the archive or remove the line")

    r.head("GRF archives")
    grf_entries = {}
    grf_files = sorted(root.glob("*.grf")) + sorted(root.glob("*.gpf"))
    if not grf_files:
        r.bad("no .grf found — the client has no assets to read")
    for g in grf_files:
        if declared and g.name not in declared:
            r.warn(f"{g.name} is on disk but not listed in DATA.INI — the client ignores it")
    for g in grf_files:
        try:
            entries, version = read_grf_entries(g)
        except GrfError as exc:
            r.bad(f"{g.name}: {exc}")
            continue
        except Exception as exc:  # noqa: BLE001 - report, never abort the run
            r.bad(f"{g.name}: could not read ({exc})")
            continue

        encrypted = sum(1 for t in entries.values()
                        if t & (TYPE_ENCRYPT_MIXED | TYPE_ENCRYPT_HEADER))
        size_gb = g.stat().st_size / (1024 ** 3)
        r.ok(f"{g.name}: {len(entries):,} entries, v0x{version:x}, {size_gb:.2f} GB")
        if encrypted:
            r.bad(f"{g.name}: {encrypted:,} entries are ENCRYPTED")
            r.info("this GRF belongs to a protected server and is not usable without its key")
        grf_entries.update(entries)

    # --- 2. loose files ------------------------------------------------------
    loose = {}
    for p in root.rglob("*"):
        if p.is_file():
            loose[norm(str(p.relative_to(root)))] = p
    r.head("Loose files")
    r.ok(f"{len(loose):,} files on disk under the client folder")

    def where(name):
        """Loose copy, GRF entry, or nowhere. A loose file wins over the archive
        when the client is patched to read the data folder first, so which one
        answers matters as much as whether either does."""
        n = norm(name)
        if n in loose:
            return "loose"
        if n in grf_entries:
            return "grf"
        return None

    def reachable(name):
        return where(name) is not None

    # The server address lives here. Note that a loose copy is what you edit —
    # if the only one is inside the GRF, changing the address means repacking
    # the archive or adding a loose file the client prefers.
    for candidate in ("data/clientinfo.xml", "data/sclientinfo.xml"):
        loc = where(candidate)
        if loc == "loose":
            r.ok(f"{candidate} present (loose — editable)")
        elif loc == "grf":
            r.warn(f"{candidate} exists only inside a GRF")
            r.info("put a loose copy in data/ so the server address can be changed")
    if not (reachable("data/clientinfo.xml") or reachable("data/sclientinfo.xml")):
        r.bad("neither data/clientinfo.xml nor data/sclientinfo.xml is reachable")
        r.info("a diffed client reads this for the server address")

    # --- 3. what the executable asks for ------------------------------------
    exes = [root / args.exe] if args.exe else find_exes(root)
    if not exes:
        r.bad("no executable over 512 KB found in the folder")
        return 1 if r.problems else 0

    for exe in exes:
        if not exe.is_file():
            r.bad(f"{exe.name}: not found")
            continue

        blob = exe.read_bytes()
        wants = sorted({norm(m.group().decode("latin-1")) for m in LUA_RE.finditer(blob)})
        mgrs = sorted({m.group().decode("latin-1") for m in MGR_RE.finditer(blob)})
        infos = sorted({m.group().decode("latin-1").lower() for m in INFO_RE.finditer(blob)})

        r.head(f"{exe.name} — {len(blob) / 1024 / 1024:.1f} MB")

        if infos:
            r.info(f"reads server config from: {', '.join(infos)}")
            for want in infos:
                if not reachable(f"data/{want}"):
                    r.bad(f"data/{want} is referenced by the exe but not reachable")

        missing = [w for w in wants if not reachable(w)]
        found = len(wants) - len(missing)

        if not args.list_missing_only:
            r.info(f"asks for {len(wants)} lua/lub paths; {found} reachable")
            if mgrs:
                r.info(f"managers: {', '.join(mgrs)}")

        if missing:
            r.bad(f"{len(missing)} file(s) the client asks for cannot be reached:")
            for m in missing:
                # A near-miss is usually the _sak / _Sakray naming trap, or
                # ROenglishRE's different spelling. Point at it rather than
                # letting it be rediscovered one error box at a time.
                stem = Path(m).stem.lower().replace("_sak", "").replace("_sakray", "")
                near = [c for c in list(loose) + list(grf_entries)
                        if stem and stem in c and c.endswith((".lub", ".lua"))][:3]
                r.info(f"  {m}")
                for n in near:
                    r.info(f"      similar name present: {n}")
        else:
            r.ok("every lua/lub path in the binary is reachable")

    # --- 4. the string table -------------------------------------------------
    # An error box with no text means the client looked up a message index that
    # msgstringtable.txt does not have. The table is how the client speaks; a
    # short one makes it mute exactly when it has something to say.
    r.head("msgstringtable.txt — can the client tell you what is wrong?")
    mst = loose.get("data/msgstringtable.txt")
    if mst:
        raw = mst.read_bytes()
        lines = raw.count(b"\n") + (0 if raw.endswith(b"\n") else 1)
        r.ok(f"loose copy: {lines:,} entries ({mst})")
        if lines < 1500:
            r.warn("that is short for a 2018 client — high indices will render as an empty box")
        r.info("run tools/make-msgtable-debug.py to make every message name its own index")
    elif "data/msgstringtable.txt" in grf_entries:
        r.warn("only inside a GRF — the client cannot be given a longer one without a loose copy")
        r.info("extract it to data/msgstringtable.txt, then run tools/make-msgtable-debug.py")
    else:
        r.bad("msgstringtable.txt not found at all — every message box will be empty")

    # --- verdict -------------------------------------------------------------
    print()
    if r.problems:
        print(f"{r.problems} problem(s) found.")
        return 1
    print("Nothing missing at the file layer.")
    print("If the client still fails, the cause is below it — make the error box")
    print("talk (tools/make-msgtable-debug.py), then read docs/phase-1-client.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
