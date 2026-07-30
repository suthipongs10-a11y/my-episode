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
import sys
from pathlib import Path

try:
    from grflib import TYPE_ENCRYPTED, GrfError, extract, norm, read_archive
except ImportError:  # invoked as tools/client-doctor.py from somewhere else
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from grflib import TYPE_ENCRYPTED, GrfError, extract, norm, read_archive

# --- what the client asks for, read straight out of the binary ---------------
# The decisive technique from docs/phase-1-client.md: every path and manager
# name the client needs is a plain string in the executable.
# ':' is in the class so a URL is captured whole and can be recognised as noise;
# without it the match starts after "http://" and looks like a real filename.
LUA_RE = re.compile(rb"[A-Za-z0-9_./\\:\- ]{3,80}\.(?:lub|lua)", re.IGNORECASE)
MGR_RE = re.compile(rb"C[A-Za-z]{3,30}Mgr")
INFO_RE = re.compile(rb"s?clientinfo\.xml", re.IGNORECASE)
DLL_RE = re.compile(rb"[A-Za-z0-9_\-]{2,40}\.dll", re.IGNORECASE)

# Where a 32-bit client can find a system DLL. SysWOW64 holds the 32-bit copies
# on 64-bit Windows and is the one that matters — System32 is 64-bit there.
SYSTEM_DLL_DIRS = (
    r"C:\Windows\SysWOW64",
    r"C:\Windows\System32",
)

# DLLs a client loads through LoadLibrary at runtime rather than importing, so a
# missing one is caught by the client instead of by Windows — no named error
# box, just whatever the client decides to show. d3dx9_*.dll is the classic:
# Windows 10 and 11 ship Direct3D 9 itself but NOT these helper libraries, which
# only arrive with the DirectX End-User Runtime (June 2010).
DLL_HINTS = {
    "d3dx9": "DirectX End-User Runtime (June 2010) — NOT included in Windows 10/11",
    "d3dcompiler_4": "DirectX End-User Runtime (June 2010)",
    "xinput1_3": "DirectX End-User Runtime (June 2010)",
    "x3daudio": "DirectX End-User Runtime (June 2010)",
    "xactengine": "DirectX End-User Runtime (June 2010)",
    "msvcr100": "Visual C++ 2010 Redistributable (x86)",
    "msvcp100": "Visual C++ 2010 Redistributable (x86)",
    "msvcr110": "Visual C++ 2012 Redistributable (x86)",
    "msvcp110": "Visual C++ 2012 Redistributable (x86)",
    "mfc110": "Visual C++ 2012 Redistributable (x86)",
    "msvcr120": "Visual C++ 2013 Redistributable (x86)",
    "mfc120": "Visual C++ 2013 Redistributable (x86)",
}


def dll_hint(name: str):
    stem = name.lower()
    for key, why in DLL_HINTS.items():
        if stem.startswith(key):
            return why
    return None

def variants(path: str):
    """Every spelling under which the client might find one required path.

    Three rules, each learned from a false positive this script produced:

    * **The `data/` prefix.** GRF entries are stored as `data\\luafiles514\\x.lub`,
      but the executable asks for `luafiles514/x.lub` — paths inside the binary
      are relative to the data root. Comparing them literally reports hundreds
      of present files as missing.
    * **`.lua` and `.lub` are interchangeable.** The binary names `.lua`; the
      shipped file is usually the compiled `.lub`. The client tries both.
    * **`_sak` / `_sakray` suffixes.** A RagexeRE prefers the Sakray variant and
      falls back to the plain name.
    """
    seen, out = set(), []

    def add(candidate):
        if candidate not in seen:
            seen.add(candidate)
            out.append(candidate)

    base = norm(path)
    # Roots the client resolves a bare path against. The lua-files root is why
    # 'hateffectinfo/hateffect_f.lua' resolves to a file three directories down.
    roots = ("", "data/", "data/luafiles514/lua files/", "luafiles514/lua files/")
    for root in roots:
        stem = base if base.startswith(root) and root else root + base
        add(stem)
        if stem.endswith(".lua"):
            add(stem[:-4] + ".lub")
        elif stem.endswith(".lub"):
            add(stem[:-4] + ".lua")

    # ai_sakray/ai.lua also lives at ai/ai.lua on a non-Sakray tree.
    for candidate in list(out):
        if "_sakray/" in candidate:
            add(candidate.replace("_sakray/", "/"))
        if "_sak." in candidate:
            add(candidate.replace("_sak.", "."))
    return out


# Strings the regex finds that are not file requests at all: URL fragments, and
# printf-style error templates the client uses to complain about a load failure.
NOISE_PREFIXES = ("fail to load ", "failed to load ", "error loading ")

# Paths whose absence is normal. Reporting these as failures buries the one or
# two that actually matter, which is how a clean client folder came back with
# "14 files missing" and looked worse than a broken one.
OPTIONAL = (
    # The client CREATES these on first run to persist UI state — window
    # positions, hotkeys, the option screen. Absent before first launch is
    # correct; they are outputs, not inputs.
    ("savedata/", "written by the client on exit, not read at startup"),
    # Homunculus / mercenary AI. Only loaded once you own one, never at startup.
    ("ai_sakray/", "homunculus AI — loaded on demand, not at startup"),
    ("ai/", "homunculus AI — loaded on demand, not at startup"),
)
# Bare Lua interpreter bootstrap names, not files shipped with the client.
OPTIONAL_EXACT = {"init.lua": "Lua bootstrap name, not a shipped file"}


def optional_reason(path: str):
    if path in OPTIONAL_EXACT:
        return OPTIONAL_EXACT[path]
    for prefix, reason in OPTIONAL:
        if path.startswith(prefix):
            return reason
    return None


def clean_request(raw: str):
    """Return the path the client actually wants, or None if it is not a path."""
    text = raw.strip()
    lowered = text.lower()
    for prefix in NOISE_PREFIXES:
        if lowered.startswith(prefix):
            text = text[len(prefix):].strip()
            lowered = text.lower()
    # "www.lua" out of a URL, and anything else that is plainly not a game path.
    if lowered.startswith(("www.", "http")) or "://" in lowered:
        return None
    if not text or text.startswith("."):
        return None
    return norm(text)


# --- GRF ---------------------------------------------------------------------
# The reader itself lives in grflib.py, imported at the top. It used to be
# copied in here; `client-survey.py` needed the same parser plus extraction, and
# two copies of a file-table parser that can disagree is a bug waiting for the
# worst possible moment. tools/test-client-survey.py covers it.


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
    ap.add_argument("--find", metavar="SUBSTRING",
                    help="list every archive entry whose path contains SUBSTRING, "
                         "then exit — use it to confirm a file really is absent")
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
    grf_source = {}   # name -> (archive, entry), so bytes can be read
    grf_files = sorted(root.glob("*.grf")) + sorted(root.glob("*.gpf"))
    if not grf_files:
        r.bad("no .grf found — the client has no assets to read")
    for g in grf_files:
        if declared and g.name not in declared:
            r.warn(f"{g.name} is on disk but not listed in DATA.INI — the client ignores it")
    for g in grf_files:
        try:
            archive = read_archive(g)
            entries = {norm(e.name): e.type for e in archive.entries}
            version = archive.version
            for e in archive.entries:
                grf_source.setdefault(norm(e.name), (archive, e))
        except GrfError as exc:
            r.bad(f"{g.name}: {exc}")
            continue
        except Exception as exc:  # noqa: BLE001 - report, never abort the run
            r.bad(f"{g.name}: could not read ({exc})")
            continue

        encrypted = sum(1 for t in entries.values() if t & TYPE_ENCRYPTED)
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
    if args.find:
        needle = args.find.lower().replace("\\", "/")
        r.head(f"Entries containing {args.find!r}")
        hits = sorted(p for p in list(loose) + list(grf_entries) if needle in p)
        for hit in hits[:200]:
            r.info(f"{'loose' if hit in loose else 'grf  '}  {hit}")
        if not hits:
            r.info("(nothing — the file is genuinely absent)")
        elif len(hits) > 200:
            r.info(f"... and {len(hits) - 200:,} more")
        return 0

    r.head("Loose files")
    r.ok(f"{len(loose):,} files on disk under the client folder")

    def where(name):
        """Loose copy, GRF entry, or nowhere. A loose file wins over the archive
        when the client is patched to read the data folder first, so which one
        answers matters as much as whether either does. Every spelling the
        client would accept is tried — see variants()."""
        for candidate in variants(name):
            if candidate in loose:
                return "loose"
            if candidate in grf_entries:
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
        wants = sorted({
            cleaned
            for m in LUA_RE.finditer(blob)
            if (cleaned := clean_request(m.group().decode("latin-1"))) is not None
        })
        mgrs = sorted({m.group().decode("latin-1") for m in MGR_RE.finditer(blob)})
        infos = sorted({m.group().decode("latin-1").lower() for m in INFO_RE.finditer(blob)})

        r.head(f"{exe.name} — {len(blob) / 1024 / 1024:.1f} MB")

        if infos:
            r.info(f"reads server config from: {', '.join(infos)}")
            for want in infos:
                if not reachable(f"data/{want}"):
                    r.bad(f"data/{want} is referenced by the exe but not reachable")

        unreachable = [w for w in wants if not reachable(w)]
        missing = [w for w in unreachable if optional_reason(w) is None]
        optional = [w for w in unreachable if optional_reason(w) is not None]
        found = len(wants) - len(unreachable)

        if not args.list_missing_only:
            r.info(f"asks for {len(wants)} lua/lub paths; {found} reachable")
            if mgrs:
                r.info(f"managers: {', '.join(mgrs)}")

        if missing:
            r.bad(f"{len(missing)} file(s) the client needs and cannot reach:")
            for m in missing:
                # A near-miss is usually the _sak / _Sakray naming trap, or
                # ROenglishRE's different spelling. Point at it rather than
                # letting it be rediscovered one error box at a time. Require a
                # reasonably long stem — matching on "ai" suggests every path
                # containing those two letters and drowns the real hint.
                stem = Path(m).stem.lower().replace("_sakray", "").replace("_sak", "")
                near = ([c for c in list(loose) + list(grf_entries)
                         if stem in c and c.endswith((".lub", ".lua"))][:3]
                        if len(stem) >= 4 else [])
                r.info(f"  {m}")
                for n in near:
                    r.info(f"      similar name present: {n}")
        else:
            r.ok("every file the client needs at startup is reachable by name")

        # --- can its bytes actually be read? --------------------------------
        # Everything above only asked whether a NAME is in the archive's table.
        # That is not the same question, and the difference cost a whole
        # session on 2026-07-30: this folder reported "zero startup files
        # missing" while every single entry in its data.grf was unreadable, and
        # roBrowser sat on a black screen saying nothing a player could see.
        #
        # An archive's file table is only zlib-compressed, so names and sizes
        # read out of a protected GRF exactly as they do out of a plain one.
        # The payload is where protection lives. So read some.
        probe_names = [w for w in wants if where(w) == "grf"]
        for extra in ("data/msgstringtable.txt", "data/resnametable.txt",
                      "data/mp3nametable.txt", "data/mapnametable.txt"):
            for cand in variants(extra):
                if where(cand) == "grf" and cand not in probe_names:
                    probe_names.append(cand)
                    break
        probe_names = probe_names[:12]

        if probe_names:
            r.head("Reading actual bytes out of the archive")
            readable, failures = 0, []
            for name in probe_names:
                found = next((variants(name)[i] for i, c in enumerate(variants(name))
                              if c in grf_source), None)
                if found is None:
                    continue
                archive, entry = grf_source[found]
                try:
                    data = extract(archive, entry)
                except GrfError as exc:
                    head = b""
                    try:
                        with archive.path.open("rb") as fp:
                            fp.seek(46 + entry.offset)
                            head = fp.read(4)
                    except OSError:
                        pass
                    failures.append((found, str(exc), head.hex(" ")))
                    continue
                if data:
                    readable += 1
            total = readable + len(failures)
            if not total:
                r.info("no GRF-resident startup files to sample")
            elif not failures:
                r.ok(f"{readable}/{total} sampled entries decompressed cleanly")
            else:
                r.bad(f"{len(failures)}/{total} sampled entries could NOT be read")
                for name, why, head in failures[:6]:
                    r.info(f"  {name}")
                    r.info(f"      {why}")
                    if head:
                        r.info(f"      first bytes: {head}   (plain deflate starts 78 9c / 78 da / 78 5e)")
                r.info("The table is readable and the payload is not, which means this")
                r.info("archive's contents are encrypted or scrambled by a packer.")
                r.info("roBrowser cannot use it: src/Loaders/GameFile.js rejects any")
                r.info('entry whose bytes are not recognisable zlib with "a new')
                r.info('encryption method which is not supported". Get an')
                r.info("unencrypted GRF, or decrypt this one with its own tool.")

        if optional and not args.list_missing_only:
            r.info(f"{len(optional)} absent but not needed to start:")
            for o in optional:
                r.info(f"  {o}  — {optional_reason(o)}")

        # --- system DLLs -----------------------------------------------------
        # The blind spot that outlasted every other check: this script only ever
        # looked at *game* files, so a missing system library was invisible to
        # it. A DLL the client loads with LoadLibrary and fails to find produces
        # no Windows error box at all — the client catches it and decides what
        # to show, which is how you get a message box with no text and a clean
        # exit code 0.
        dlls = sorted({m.group().decode("latin-1").lower() for m in DLL_RE.finditer(blob)})
        search_dirs = [root] + [Path(d) for d in SYSTEM_DLL_DIRS if Path(d).is_dir()]
        if len(search_dirs) == 1:
            r.info("(not on Windows — system DLL check skipped)")
        else:
            unresolved = []
            for dll in dlls:
                if not any((d / dll).is_file() for d in search_dirs):
                    unresolved.append(dll)
            named = [(d, dll_hint(d)) for d in unresolved]
            blocking = [(d, why) for d, why in named if why]
            if blocking:
                r.bad(f"{len(blocking)} runtime DLL(s) named by the binary are not installed:")
                for dll, why in blocking:
                    r.info(f"  {dll}  — install: {why}")
            elif unresolved:
                r.ok("every runtime DLL with a known installer is present")
                r.info(f"({len(unresolved)} other .dll names unresolved — usually "
                       "plugin or optional-feature names, not required)")
            else:
                r.ok("every .dll named by the binary resolves")

    # --- 4. the string table -------------------------------------------------
    # An error box with no text means the client looked up a message index that
    # msgstringtable.txt does not have. The table is how the client speaks; a
    # short one makes it mute exactly when it has something to say.
    r.head("msgstringtable.txt — can the client tell you what is wrong?")
    mst = loose.get("data/msgstringtable.txt") or loose.get("msgstringtable.txt")
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
