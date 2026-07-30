#!/usr/bin/env python3
# =============================================================================
# client-survey — inventory everything a Ragnarok client folder contains
# =============================================================================
#   python tools\client-survey.py "C:\Games\EternalRO"
#   python tools\client-survey.py "C:\Games\EternalRO" --extract ^
#          --baseline "C:\Games\Ep4Client2\data.grf"
#
# Run it on the machine that has the client. Standard library only, no install,
# works offline, reads nothing outside the folder you point it at.
#
# WHY THIS EXISTS, AND HOW IT DIFFERS FROM client-doctor.py
#
# `client-doctor.py` asks one question about *our* client: is every file it
# needs to start actually reachable. It is a debugger for a broken folder.
#
# This asks a different question about *somebody else's* client: what is in
# here, and what does it tell us about the server behind it. CLAUDE.md §8a
# names `eternal-origin.com` as the reference we are trying to match, and their
# installed client is the most detailed public description of that server that
# exists — their content roster, their client date, their protection, their
# server address, their patch delivery. All of it readable without defeating
# anything, because a GRF's *file table* is only zlib-compressed even when the
# entry contents are encrypted.
#
# WHAT IT WILL NOT DO
#
# It does not decrypt protected entries and does not try to (see grflib.py). If
# an archive is Gepard-protected, this reports which entries exist and that
# they are locked, and that is the honest end of it. Everything it reads is
# either plain metadata or an unencrypted text/config entry.
#
# WHAT IT WRITES  (default: ./client-survey-<folder>/)
#
#   report.md            the committable summary — capped lists, no assets
#   survey.json          the same findings, structured
#   manifest/<grf>.txt   every entry in that archive: name, size, flags
#   diff/*.txt           added / removed / changed vs --baseline
#   extracted/...        text and config entries, with --extract
#
# CLAUDE.md §2.3 forbids committing assets. `manifest/`, `diff/` and
# `extracted/` are gitignored by docs/recon/.gitignore for that reason; the
# report is the artifact meant to be shared.
# =============================================================================
import argparse
import json
import math
import re
import struct
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    from grflib import GrfEncrypted, GrfError, GrfUnsupported, display, norm, read_archive
except ImportError:  # run from the repo root rather than from tools/
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from grflib import GrfEncrypted, GrfError, GrfUnsupported, display, norm, read_archive

# How many rows any "top N" list shows in report.md. Full lists go to manifest/.
TOP = 25

# Lowercase only A-Z, leaving bytes above 0x7f alone.
#
# `grflib.norm()` lowercases the whole string, which is right for matching and
# wrong for display: a kRO archive's Korean directory names are cp949 bytes
# carried through as latin-1 characters, and `str.lower()` rewrites 'À' (0xC0)
# to 'à' (0xE0) — silently corrupting the byte sequence so it will no longer
# decode as cp949. Every path that is later shown to a human goes through this
# instead, so `data/texture/유저인터페이스` survives being grouped case-insensitively.
ASCII_LOWER = str.maketrans({chr(c): chr(c + 32) for c in range(0x41, 0x5B)})


def norm_keep_bytes(name: str) -> str:
    return name.replace("\\", "/").lstrip("./").translate(ASCII_LOWER)

# --- what we are looking for in an executable --------------------------------
# Every one of these is a plain string in the binary. `docs/phase-1-client.md`
# calls reading them out "the decisive technique" — it is how the complete list
# of required System/ files was recovered for our own client.
URL_RE = re.compile(rb"(?:https?|ftp)://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]{4,150}")
HOST_RE = re.compile(
    rb"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,40}[a-zA-Z0-9])?\.)+"
    rb"(?:com|net|org|io|co|gg|th|kr|ru|info|xyz|online|site|shop|app|dev|me)\b"
)
# No trailing \b on either. The client date is most often carried in a name
# like `2018-06-20eRagexeRE`, where the digits run straight into a letter, so a
# word boundary after them matches nothing — and that one string is the most
# decision-shaping thing in the whole folder (CLAUDE.md §3a Q1). Lookarounds
# guard against matching a fragment of a longer number instead.
DATE_RE = re.compile(rb"(?<![\d-])20[0-2]\d-[01]\d-[0-3]\d(?!\d)")
PACKETVER_RE = re.compile(rb"(?<!\d)20[0-2]\d[01]\d[0-3]\d(?!\d)")
MGR_RE = re.compile(rb"C[A-Za-z]{3,30}Mgr")
LUA_RE = re.compile(rb"[A-Za-z0-9_./\\:\- ]{3,80}\.(?:lub|lua)", re.IGNORECASE)
EXE_KIND_RE = re.compile(rb"(?:Ragexe|RagexeRE|Sakexe|Sakray|Zero)(?:RE)?")
UTF16_RUN = re.compile(rb"(?:[\x20-\x7e]\x00){4,200}")

# Anti-cheat and packer names. Presence is not proof it is active, but absence
# is fairly good evidence it is not there at all.
PROTECTION_MARKERS = {
    "Gepard Shield": (b"gepard",),
    "v3hunt (Ahnlab)": (b"v3hunt", b"ahnlab"),
    "Themida / WinLicense": (b"themida", b"winlicense", b"oreans"),
    "VMProtect": (b"vmprotect", b".vmp"),
    "Enigma Protector": (b"enigma protector",),
    "nProtect GameGuard": (b"gameguard", b"nprotect"),
    "XignCode": (b"xigncode", b"xhunter"),
    "HackShield": (b"hackshield",),
    "EasyAntiCheat": (b"easyanticheat",),
    "UPX": (b"upx0", b"upx1"),
}

# Section names that mean the image is packed. A packed client is one we cannot
# read strings out of, which changes what the rest of this report can say.
PACKER_SECTIONS = {
    ".themida": "Themida / WinLicense",
    ".winlic": "WinLicense",
    ".vmp0": "VMProtect",
    ".vmp1": "VMProtect",
    ".enigma1": "Enigma Protector",
    ".enigma2": "Enigma Protector",
    "upx0": "UPX",
    "upx1": "UPX",
    ".aspack": "ASPack",
    ".adata": "ASPack",
    ".mpress1": "MPRESS",
    ".petite": "Petite",
    ".taz": "PESpin",
    ".boom": "Boomerang",
}

# Client-side evidence of a server feature. String evidence, not proof — but
# CLAUDE.md §8a's content-era table was built from screenshots, and this is a
# cheaper and much more complete way to build the same table.
CAPABILITY_MARKERS = {
    "Cash shop": (b"cashshop", b"cash_shop"),
    "Achievements": (b"achievement",),
    "Homunculus (auto-feed)": (b"homun", b"autofeed", b"auto_feed"),
    "RODEX mail": (b"rodex",),
    "Attendance / login rewards": (b"attendance",),
    "Roulette": (b"roulette",),
    "Bank": (b"bankaccount", b"banking"),
    "Party booking": (b"partybooking", b"party_booking"),
    "Costume / stylist": (b"costume",),
    "Battlegrounds": (b"battleground", b"bg_queue"),
    "Clan system": (b"clan",),
    "Guild storage": (b"guildstorage", b"guild_storage"),
    "Item options / random options": (b"randomoption", b"itemoption"),
    "Equipment switch": (b"equipswitch", b"equip_switch"),
    "Rebellion / Kagerou (3rd expanded)": (b"rebellion", b"kagerou", b"oboro"),
    "Summoner (Doram)": (b"summoner", b"doram"),
    "4th job / expanded classes": (b"dragonknight", b"imperialguard", b"meister",
                                   b"shadowcross", b"arcwand", b"cardinal"),
    "Macro / captcha detection": (b"macro_detect", b"captcha"),
    "Refine UI (packet-driven)": (b"refineui", b"refine_ui"),
    "Enchant grade": (b"enchantgrade", b"grade_enchant"),
}

# A file at the top of a client folder that tells you how it is delivered and
# patched. Highest-value non-GRF thing in the folder for CLAUDE.md Phase 5/6.
CONFIG_EXTS = {".ini", ".xml", ".txt", ".json", ".cfg", ".conf", ".url", ".bat",
               ".cmd", ".yml", ".yaml", ".lst", ".dat"}
CONFIG_INLINE_BYTES = 4096  # inline a config this small into report.md
CONFIG_INLINE_MAX = 12  # ... for at most this many files

# Anything that looks like a credential gets its value replaced before it can
# land in a committed report. CLAUDE.md §2.2 in spirit: their secrets are not
# ours to publish either.
SECRET_RE = re.compile(
    r"((?:pass|passwd|password|pwd|secret|token|apikey|api_key|auth|key)\s*[:=]\s*)"
    r"([^\s,;]{3,})",
    re.IGNORECASE,
)

# Text-ish entries worth pulling out of an archive with --extract.
EXTRACT_EXTS = {".xml", ".txt", ".lua", ".lub", ".json", ".ini", ".csv"}
EXTRACT_MAX_ENTRY = 2 * 1024 * 1024
EXTRACT_MAX_TOTAL = 64 * 1024 * 1024
EXTRACT_MAX_FILES = 6000


def redact(text: str) -> str:
    return SECRET_RE.sub(lambda m: m.group(1) + "<redacted>", text)


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:,.0f} {unit}" if unit == "B" else f"{n:.2f} {unit}"
        n /= 1024
    return f"{n:.2f} TB"


def decode_text(raw: bytes) -> str:
    """Client text files are cp874 (Thai), cp949 (Korean) or utf-8, and which
    one is not written down anywhere. latin-1 last so this never throws."""
    for enc in ("utf-8-sig", "utf-8", "cp949", "cp874", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", "replace")


def entropy(data: bytes) -> float:
    """Shannon bits per byte. Compressed or encrypted data sits above ~7.2;
    ordinary x86 code sits around 6. It is the cheapest packing test there is."""
    if not data:
        return 0.0
    counts = Counter(data)
    total = len(data)
    return -sum((c / total) * math.log2(c / total) for c in counts.values())


# =============================================================================
# 1. the folder itself
# =============================================================================
def survey_tree(root: Path, report, out: dict):
    report.head("Folder")
    files = []
    unreadable = 0
    for path in root.rglob("*"):
        try:
            if path.is_file():
                files.append((path, path.stat().st_size))
        except OSError:
            unreadable += 1

    total = sum(size for _, size in files)
    report.line(f"{len(files):,} files, {human(total)} total")
    if unreadable:
        report.line(f"{unreadable} path(s) could not be read (permissions or long path)")

    by_ext = Counter()
    bytes_by_ext = Counter()
    for path, size in files:
        ext = path.suffix.lower() or "(none)"
        by_ext[ext] += 1
        bytes_by_ext[ext] += size

    report.sub("By extension")
    report.table(
        ["ext", "files", "bytes"],
        [
            [ext, f"{count:,}", human(bytes_by_ext[ext])]
            for ext, count in by_ext.most_common(TOP)
        ],
    )

    report.sub("Largest files")
    report.table(
        ["file", "size"],
        [
            [str(path.relative_to(root)), human(size)]
            for path, size in sorted(files, key=lambda f: -f[1])[:15]
        ],
    )

    # DLLs beside the executable are the anti-cheat's fingerprint. Gepard ships
    # as a DLL next to the exe; so does v3hunt.
    dlls = sorted(
        {
            str(path.relative_to(root))
            for path, _ in files
            if path.suffix.lower() == ".dll"
        }
    )
    if dlls:
        report.sub(f"DLLs shipped with the client ({len(dlls)})")
        report.bullets(dlls[:40])
        if len(dlls) > 40:
            report.line(f"... and {len(dlls) - 40} more (see survey.json)")

    top_dirs = Counter()
    for path, size in files:
        rel = path.relative_to(root)
        top_dirs[rel.parts[0] if len(rel.parts) > 1 else "(root)"] += size
    report.sub("Top-level layout")
    report.table(
        ["path", "bytes"],
        [[name, human(size)] for name, size in top_dirs.most_common(TOP)],
    )

    out["folder"] = {
        "path": str(root),
        "file_count": len(files),
        "total_bytes": total,
        "unreadable_paths": unreadable,
        "by_extension": {e: by_ext[e] for e in by_ext},
        "bytes_by_extension": {e: bytes_by_ext[e] for e in bytes_by_ext},
        "dlls": dlls,
        "top_level_bytes": dict(top_dirs),
        "largest": [
            [str(p.relative_to(root)), s]
            for p, s in sorted(files, key=lambda f: -f[1])[:40]
        ],
    }
    return files


# =============================================================================
# 2. the executables
# =============================================================================
def rva_to_offset(rva: int, sections):
    for sec in sections:
        start = sec["virtual_address"]
        size = max(sec["virtual_size"], sec["raw_size"])
        if start <= rva < start + size:
            return sec["raw_pointer"] + (rva - start)
    return None


def pe_info(blob: bytes) -> dict:
    """Header, sections and imported DLLs. Returns {'error': ...} rather than
    raising — a survey that dies on one odd binary is useless."""
    info = {}
    try:
        if blob[:2] != b"MZ":
            return {"error": "no MZ signature — not a Windows executable"}
        (e_lfanew,) = struct.unpack_from("<I", blob, 0x3C)
        if blob[e_lfanew : e_lfanew + 4] != b"PE\0\0":
            return {"error": "no PE signature"}

        coff = e_lfanew + 4
        machine, nsections, timestamp = struct.unpack_from("<HHI", blob, coff)
        (opt_size,) = struct.unpack_from("<H", blob, coff + 16)
        opt = coff + 20
        (magic,) = struct.unpack_from("<H", blob, opt)
        is_pe32_plus = magic == 0x20B

        info["machine"] = {0x14C: "i386 (32-bit)", 0x8664: "x86-64", 0x1C0: "arm"}.get(
            machine, f"0x{machine:x}"
        )
        info["bits"] = 64 if is_pe32_plus else 32
        info["timestamp"] = timestamp
        info["built"] = (
            datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
            if 0 < timestamp < 4102444800
            else "implausible (stripped or reproducible build)"
        )
        (info["entry_point"],) = struct.unpack_from("<I", blob, opt + 16)
        (subsystem,) = struct.unpack_from("<H", blob, opt + 68)
        info["subsystem"] = {2: "Windows GUI", 3: "Windows console"}.get(
            subsystem, str(subsystem)
        )

        sec_at = opt + opt_size
        sections = []
        for i in range(nsections):
            base = sec_at + i * 40
            raw_name = blob[base : base + 8]
            name = raw_name.split(b"\0")[0].decode("latin-1", "replace")
            vsize, vaddr, rsize, rptr = struct.unpack_from("<IIII", blob, base + 8)
            (chars,) = struct.unpack_from("<I", blob, base + 36)
            sample = blob[rptr : rptr + min(rsize, 1024 * 1024)]
            sections.append(
                {
                    "name": name,
                    "virtual_size": vsize,
                    "virtual_address": vaddr,
                    "raw_size": rsize,
                    "raw_pointer": rptr,
                    "characteristics": chars,
                    "entropy": round(entropy(sample), 2),
                }
            )
        info["sections"] = sections

        packers = sorted(
            {
                label
                for sec in sections
                for key, label in PACKER_SECTIONS.items()
                if sec["name"].lower() == key
            }
        )
        info["packer_sections"] = packers

        # The optional header's tail differs between PE32 and PE32+ only in the
        # four 8-byte stack/heap fields, so NumberOfRvaAndSizes lands 16 bytes
        # later in a 64-bit image and the data directory follows it.
        count_at = opt + (108 if is_pe32_plus else 92)
        dir_at = count_at + 4
        (n_dirs,) = struct.unpack_from("<I", blob, count_at)
        imports = []
        if n_dirs >= 2:
            import_rva, _ = struct.unpack_from("<II", blob, dir_at + 8)
            table_at = rva_to_offset(import_rva, sections) if import_rva else None
            while table_at is not None:
                descriptor = blob[table_at : table_at + 20]
                if len(descriptor) < 20 or descriptor == b"\0" * 20:
                    break
                (name_rva,) = struct.unpack_from("<I", descriptor, 12)
                name_at = rva_to_offset(name_rva, sections)
                if name_at is None:
                    break
                # A truncated image can leave the name unterminated, and find()
                # answering -1 would slice almost the entire file in as one
                # "DLL name". Bound it to something longer than any real name.
                end = blob.find(b"\0", name_at, name_at + 256)
                if end < 0:
                    break
                imports.append(blob[name_at:end].decode("latin-1", "replace").lower())
                table_at += 20
                if len(imports) > 400:
                    break
        info["imports"] = sorted(set(imports))
    except (struct.error, IndexError, ValueError) as exc:
        info["error"] = f"{type(exc).__name__}: {exc}"
    return info


def flatten_strings(blob: bytes) -> bytes:
    """One searchable blob holding both the 8-bit and the UTF-16LE strings.

    Half of a modern client's interesting strings are wide — a regex run only
    over the raw bytes finds `gepard.dll` and misses `G\\0e\\0p\\0a\\0r\\0d\\0`.
    """
    wide = b"\n".join(
        m.group()[::2] for m in UTF16_RUN.finditer(blob)
    )
    return blob + b"\n" + wide


def survey_executables(root: Path, report, out: dict, args):
    # Largest first, with no size floor. A floor was the obvious way to skip
    # uninstallers and helper stubs, and it was wrong: a launcher or patcher is
    # often a few hundred KB and is the file that names the patch server, which
    # is the single most useful string in the folder for Phase 5.
    def size_of(path: Path) -> int:
        try:
            return path.stat().st_size
        except OSError:
            return 0

    exes = (
        [root / args.exe]
        if args.exe
        else sorted((p for p in root.rglob("*.exe") if p.is_file()),
                    key=lambda p: -size_of(p))
    )
    out["executables"] = []
    if not exes:
        report.head("Executables")
        report.line("no .exe in the folder")
        return

    for exe in exes[: args.max_exes]:
        if not exe.is_file():
            report.head(f"Executable {exe}")
            report.line("not found")
            continue

        blob = exe.read_bytes()
        flat = flatten_strings(blob)
        lower = flat.lower()
        try:
            rel = str(exe.relative_to(root))
        except ValueError:  # --exe given as an absolute path elsewhere
            rel = str(exe)
        report.head(f"Executable: {rel} ({human(len(blob))})")

        pe = pe_info(blob)
        record = {"path": rel, "size": len(blob), "pe": pe}

        if "error" in pe:
            report.line(f"PE header: {pe['error']}")
        else:
            report.line(
                f"{pe['machine']}, {pe['subsystem']}, "
                f"linked {pe['built']} ({pe['timestamp']})"
            )
            report.sub("Sections")
            report.table(
                ["name", "raw size", "entropy"],
                [
                    [s["name"], human(s["raw_size"]), f"{s['entropy']:.2f}"]
                    for s in pe["sections"]
                ],
            )
            if pe["packer_sections"]:
                report.line(
                    "**packed** — section names match: "
                    + ", ".join(pe["packer_sections"])
                )
                report.line(
                    "a packed image hides its strings, so the lists below are "
                    "whatever survived; absence of a marker proves nothing here"
                )
            hot = [s for s in pe["sections"] if s["entropy"] > 7.2 and s["raw_size"]]
            if hot and not pe["packer_sections"]:
                report.line(
                    "high-entropy section(s) with no known packer name: "
                    + ", ".join(f"{s['name']} ({s['entropy']:.2f})" for s in hot)
                )
            if pe["imports"]:
                report.sub(f"Imported DLLs ({len(pe['imports'])})")
                report.bullets(pe["imports"][:40])

        # --- protection ------------------------------------------------------
        found = {
            label: sum(lower.count(m) for m in markers)
            for label, markers in PROTECTION_MARKERS.items()
            if any(m in lower for m in markers)
        }
        report.sub("Protection markers")
        if found:
            report.table(
                ["product", "string hits"],
                [[k, f"{v:,}"] for k, v in sorted(found.items(), key=lambda kv: -kv[1])],
            )
        else:
            report.line("none of the known anti-cheat or packer names appear")
        record["protection"] = found

        # --- client date -----------------------------------------------------
        # The single most decision-shaping number in the folder: it fixes what
        # packetver the server behind it speaks (CLAUDE.md §3a Q1).
        dates = Counter(m.group().decode() for m in DATE_RE.finditer(flat))
        packetvers = Counter(m.group().decode() for m in PACKETVER_RE.finditer(flat))
        kinds = Counter(m.group().decode() for m in EXE_KIND_RE.finditer(flat))
        report.sub("Client date candidates")
        if dates or packetvers:
            report.table(
                ["string", "hits", "form"],
                [[d, f"{c:,}", "YYYY-MM-DD"] for d, c in dates.most_common(10)]
                + [[d, f"{c:,}", "YYYYMMDD"] for d, c in packetvers.most_common(10)],
            )
        else:
            report.line("no date-shaped strings — likely packed")
        if kinds:
            report.line("client family: " + ", ".join(sorted(kinds)))
        record["dates"] = dict(dates.most_common(20))
        record["packetver_candidates"] = dict(packetvers.most_common(20))
        record["client_family"] = sorted(kinds)

        # --- where it talks to ----------------------------------------------
        urls = Counter(m.group().decode("latin-1") for m in URL_RE.finditer(flat))
        hosts = Counter(m.group().decode("latin-1").lower() for m in HOST_RE.finditer(flat))
        report.sub("URLs and hostnames")
        if urls or hosts:
            report.table(
                ["string", "hits"],
                [[redact(u), f"{c:,}"] for u, c in urls.most_common(TOP)]
                + [[h, f"{c:,}"] for h, c in hosts.most_common(TOP)],
            )
        else:
            report.line("none found")
        record["urls"] = dict(urls.most_common(60))
        record["hosts"] = dict(hosts.most_common(60))

        # --- capabilities ----------------------------------------------------
        caps = {
            label: sum(lower.count(m) for m in markers)
            for label, markers in CAPABILITY_MARKERS.items()
            if any(m in lower for m in markers)
        }
        report.sub("Feature evidence (string hits — indicative, not proof)")
        report.table(
            ["feature", "hits"],
            [[k, f"{v:,}"] for k, v in sorted(caps.items(), key=lambda kv: -kv[1])],
        )
        record["capabilities"] = caps

        mgrs = sorted({m.group().decode("latin-1") for m in MGR_RE.finditer(flat)})
        luas = sorted(
            {
                norm(m.group().decode("latin-1"))
                for m in LUA_RE.finditer(flat)
                if b"://" not in m.group()
            }
        )
        report.line(f"{len(mgrs)} `C*Mgr` manager names, {len(luas)} lua/lub paths")
        record["managers"] = mgrs
        record["lua_paths"] = luas

        out["executables"].append(record)

    if len(exes) > args.max_exes:
        report.line(
            f"({len(exes) - args.max_exes} further executable(s) not analysed — "
            f"raise --max-exes)"
        )


# =============================================================================
# 3. server configuration
# =============================================================================
CLIENTINFO_FIELDS = (
    "servicetype", "servertype", "display", "address", "port", "version",
    "langtype", "registrationweb", "aid", "desc", "balloon", "yellow",
    "loading", "hideaccountlist", "extendedslot", "readfolder", "aid",
)


def parse_clientinfo(raw: bytes) -> dict:
    """Field name -> list of values. Regex rather than an XML parser on purpose:
    real clientinfo.xml files are cp949/cp874, frequently have an unescaped `&`
    in a server description, and an XML parser refuses the whole file over it."""
    text = decode_text(raw)
    found = defaultdict(list)
    for field in set(CLIENTINFO_FIELDS):
        for m in re.finditer(
            rf"<\s*{field}\s*>(.*?)<\s*/\s*{field}\s*>", text, re.I | re.S
        ):
            value = m.group(1).strip()
            if value and value not in found[field]:
                found[field].append(value)
    return dict(found)


def survey_server_config(root: Path, files, archives, report, out: dict):
    report.head("Server configuration (clientinfo)")
    out["clientinfo"] = []

    # Matched against the walked file list rather than by stat(), because a
    # loose `Data/ClientInfo.xml` is the same file to the client and would be
    # missed by an exact-path probe on a case-sensitive filesystem.
    loose_by_name = {norm(str(path.relative_to(root))): path for path, _ in files}

    candidates = []
    for name in ("data/clientinfo.xml", "data/sclientinfo.xml"):
        loose = loose_by_name.get(name)
        if loose is not None:
            candidates.append((f"{name} (loose)", loose.read_bytes()))
        for archive in archives:
            entry = archive.get(name)
            if entry is None:
                continue
            try:
                candidates.append(
                    (f"{name} (in {archive.path.name})", archive.read(entry))
                )
            except GrfError as exc:
                report.line(f"{name} in {archive.path.name}: {exc}")

    if not candidates:
        report.line(
            "no clientinfo.xml or sclientinfo.xml found — either it is named "
            "something else by a diff patch, or the folder is incomplete"
        )
        return

    for label, raw in candidates:
        fields = parse_clientinfo(raw)
        report.sub(label)
        if not fields:
            report.line("no recognised fields — dumping first 400 bytes as text")
            report.code(redact(decode_text(raw)[:400]))
        else:
            report.table(
                ["field", "value(s)"],
                [
                    [field, ", ".join(redact(v) for v in values)[:300]]
                    for field, values in sorted(fields.items())
                ],
            )
        out["clientinfo"].append({"source": label, "fields": fields})

    # The reason this section exists at all: an address and a port here are the
    # server's real ingress, which is the whole of CLAUDE.md §3c.
    # Deduplicated: the same clientinfo.xml usually turns up both loose and
    # inside an archive, and printing the one address twice reads as two servers.
    addresses = list(
        dict.fromkeys(
            v for record in out["clientinfo"] for v in record["fields"].get("address", [])
        )
    )
    ports = list(
        dict.fromkeys(
            v for record in out["clientinfo"] for v in record["fields"].get("port", [])
        )
    )
    if addresses:
        report.line(
            f"**Ingress:** {', '.join(addresses)} port {', '.join(ports) or '?'} — "
            f"if that is a bare IP the origin is public and nothing is fronting "
            f"the game traffic (CLAUDE.md §3c)"
        )


# =============================================================================
# 4. loose config files
# =============================================================================
def survey_configs(root: Path, files, report, out: dict):
    report.head("Loose config files")
    interesting = []
    for path, size in files:
        rel = path.relative_to(root)
        if len(rel.parts) > 3:
            continue
        if path.suffix.lower() in CONFIG_EXTS and size <= 256 * 1024:
            interesting.append((rel, path, size))
    interesting.sort(key=lambda item: (len(item[0].parts), str(item[0]).lower()))

    if not interesting:
        report.line("none")
        out["configs"] = []
        return

    report.table(
        ["file", "size"],
        [[str(rel), human(size)] for rel, _, size in interesting[:40]],
    )
    if len(interesting) > 40:
        report.line(f"... and {len(interesting) - 40} more")

    out["configs"] = []
    inlined = 0
    for rel, path, size in interesting:
        record = {"path": str(rel), "size": size}
        if size <= CONFIG_INLINE_BYTES and inlined < CONFIG_INLINE_MAX:
            text = redact(decode_text(path.read_bytes()))
            report.sub(str(rel))
            report.code(text)
            record["content"] = text
            inlined += 1
        out["configs"].append(record)


# =============================================================================
# 5. the archives — the actual inventory
# =============================================================================
def bucket(name: str) -> str:
    """Group an entry by the part of the tree it lives in. Two levels is the
    level that separates sprite from texture from model from sound, which is
    the breakdown that tells you what kind of content a server ships."""
    parts = norm_keep_bytes(name).split("/")
    return "/".join(parts[:2]) if len(parts) > 2 else (parts[0] if parts else "?")


def survey_archives(root: Path, report, out: dict, outdir: Path, args):
    grfs = sorted(root.rglob("*.grf")) + sorted(root.rglob("*.gpf"))
    report.head("Archives")
    out["archives"] = []
    archives = []

    if not grfs:
        report.line("no .grf or .gpf found")
        return archives

    # DATA.INI decides load order and which archives are even used. An archive
    # on disk that DATA.INI omits is dead weight the client never reads.
    data_ini = next(
        (p for p in root.iterdir() if p.is_file() and p.name.lower() == "data.ini"),
        None,
    )
    declared = []
    if data_ini:
        for line in decode_text(data_ini.read_bytes()).splitlines():
            line = line.strip()
            if "=" in line and not line.startswith(("[", ";", "#", "//")):
                value = line.split("=", 1)[1].strip()
                if value.lower().endswith((".grf", ".gpf")):
                    declared.append(value)
        report.line(f"DATA.INI load order: {', '.join(declared) or '(none declared)'}")
        for name in declared:
            if not (root / name).is_file():
                report.line(f"**{name} is declared in DATA.INI but is not on disk**")
    else:
        report.line("no DATA.INI — the client uses its built-in default list")
    out["data_ini"] = declared

    manifest_dir = outdir / "manifest"
    manifest_dir.mkdir(parents=True, exist_ok=True)

    for grf in grfs:
        size = grf.stat().st_size
        try:
            archive = read_archive(grf)
        except GrfError as exc:
            report.sub(grf.name)
            report.line(f"could not read: {exc}")
            out["archives"].append({"name": grf.name, "error": str(exc)})
            continue
        except Exception as exc:  # noqa: BLE001 — report, never abort a survey
            report.sub(grf.name)
            report.line(f"could not read: {type(exc).__name__}: {exc}")
            out["archives"].append({"name": grf.name, "error": str(exc)})
            continue

        archives.append(archive)
        entries = archive.files
        buckets = Counter()
        bucket_bytes = Counter()
        exts = Counter()
        maps = []
        for entry in entries:
            key = bucket(entry.name)
            buckets[key] += 1
            bucket_bytes[key] += entry.real_size
            low = norm(entry.name)
            exts[Path(low).suffix or "(none)"] += 1
            if low.endswith(".rsw"):
                maps.append(Path(low).stem)

        report.sub(f"{grf.name} — {human(size)} on disk")
        report.line(
            f"{len(archive):,} entries ({len(entries):,} files), "
            f"format v0x{archive.version:x}, "
            f"{sum(e.real_size for e in entries) / 1024**3:.2f} GB uncompressed"
        )
        if declared and grf.name not in declared:
            report.line("not listed in DATA.INI — the client ignores this archive")
        if archive.encrypted_count:
            report.line(
                f"**{archive.encrypted_count:,} entries are encrypted** — this is a "
                f"protected server's archive. Names are readable, contents are not, "
                f"and we are not attacking the key (grflib.py)."
            )

        report.line(f"map files (.rsw): {len(maps):,}")
        report.table(
            ["area", "files", "uncompressed"],
            [
                [display(key), f"{count:,}", human(bucket_bytes[key])]
                for key, count in buckets.most_common(TOP)
            ],
        )
        report.line(
            "by type: "
            + ", ".join(f"{ext} {count:,}" for ext, count in exts.most_common(12))
        )

        # One level deeper where it pays: a server's own UI skin lives in
        # `data/texture/유저인터페이스`, and its custom classes and monsters live
        # in `data/sprite/<class>`. Two-level buckets stop just short of both.
        for parent in ("data/texture", "data/sprite", "data/model"):
            deeper = Counter()
            prefix = parent + "/"
            for entry in entries:
                low = norm_keep_bytes(entry.name)
                if not low.startswith(prefix):
                    continue
                rest = low[len(prefix):].split("/")
                deeper[rest[0] if len(rest) > 1 else "(files here)"] += 1
            if deeper:
                report.line(
                    f"inside `{parent}`: "
                    + ", ".join(
                        f"{display(name)} {count:,}"
                        for name, count in deeper.most_common(15)
                    )
                )

        manifest = manifest_dir / f"{grf.stem}.txt"
        with manifest.open("w", encoding="utf-8") as fp:
            fp.write(f"# {grf.name}: {len(archive):,} entries, v0x{archive.version:x}\n")
            fp.write("# size_uncompressed\tflags\tname\n")
            for entry in sorted(archive.entries, key=lambda e: norm(e.name)):
                flags = "enc" if entry.is_encrypted else ("file" if entry.is_file else "dir")
                fp.write(f"{entry.real_size}\t{flags}\t{display(entry.name)}\n")
        report.line(f"full entry list: `{manifest.relative_to(outdir)}`")

        if maps:
            map_list = manifest_dir / f"{grf.stem}-maps.txt"
            map_list.write_text("\n".join(sorted(set(maps))) + "\n", encoding="utf-8")
            report.line(f"map roster: `{map_list.relative_to(outdir)}`")

        out["archives"].append(
            {
                "name": grf.name,
                "path": str(grf.relative_to(root)),
                "disk_bytes": size,
                "version": archive.version,
                "entries": len(archive),
                "files": len(entries),
                "encrypted": archive.encrypted_count,
                "uncompressed_bytes": sum(e.real_size for e in entries),
                "declared_in_data_ini": (not declared) or grf.name in declared,
                "buckets": {display(k): v for k, v in buckets.most_common(200)},
                "extensions": dict(exts.most_common(60)),
                "map_count": len(set(maps)),
            }
        )

    return archives


# =============================================================================
# 6. diff against a stock archive — their custom content, isolated
# =============================================================================
def survey_diff(archives, report, out: dict, outdir: Path, baselines):
    report.head("Difference from the stock baseline")
    if not baselines:
        report.line(
            "no --baseline given. Point it at a stock kRO `data.grf` "
            "(`Ep4Client2\\data.grf` will do) and this section becomes the list "
            "of every file this server added or changed — which is the Phase 4 "
            "content roster, read straight off their disk."
        )
        out["diff"] = None
        return

    stock = {}
    for path in baselines:
        try:
            archive = read_archive(Path(path))
        except (GrfError, OSError) as exc:
            report.line(f"baseline {path}: could not read ({exc})")
            continue
        for entry in archive.files:
            stock.setdefault(norm(entry.name), entry)
        report.line(f"baseline {Path(path).name}: {len(archive.files):,} files")

    if not stock:
        out["diff"] = None
        return

    theirs = {}
    for archive in archives:
        for entry in archive.files:
            theirs[norm(entry.name)] = entry  # later archives win, as DATA.INI order

    added = sorted(set(theirs) - set(stock))
    removed = sorted(set(stock) - set(theirs))
    changed = sorted(
        name
        for name in set(theirs) & set(stock)
        if theirs[name].real_size != stock[name].real_size
    )

    report.table(
        ["relationship to stock", "files"],
        [
            ["only in this client — their additions", f"{len(added):,}"],
            ["same name, different size — their edits", f"{len(changed):,}"],
            ["only in stock — absent here", f"{len(removed):,}"],
        ],
    )

    diff_dir = outdir / "diff"
    diff_dir.mkdir(parents=True, exist_ok=True)
    for label, names, source in (
        ("added", added, theirs),
        ("changed", changed, theirs),
        ("removed", removed, stock),
    ):
        (diff_dir / f"{label}.txt").write_text(
            "\n".join(display(source[n].name) for n in names) + "\n", encoding="utf-8"
        )

    added_buckets = Counter(bucket(theirs[n].name) for n in added)
    changed_buckets = Counter(bucket(theirs[n].name) for n in changed)
    report.sub("Where their additions live")
    report.table(
        ["area", "added", "changed"],
        [
            [display(key), f"{count:,}", f"{changed_buckets.get(key, 0):,}"]
            for key, count in added_buckets.most_common(TOP)
        ],
    )
    report.sub("Custom maps they added")
    custom_maps = [Path(n).stem for n in added if n.endswith(".rsw")]
    report.line(
        ", ".join(sorted(custom_maps)[:60]) if custom_maps else "none"
    )
    report.line("full lists: `diff/added.txt`, `diff/changed.txt`, `diff/removed.txt`")

    out["diff"] = {
        "baselines": [str(p) for p in baselines],
        "added": len(added),
        "changed": len(changed),
        "removed": len(removed),
        "added_buckets": {display(k): v for k, v in added_buckets.most_common(200)},
        "custom_maps": sorted(custom_maps)[:500],
    }


# =============================================================================
# 7. extraction of text and config entries
# =============================================================================
def safe_destination(target: Path, entry_name: str):
    """Where an entry may be written, or None if it is trying to escape.

    Entry names come out of somebody else's archive, and nothing stops one from
    being `..\\..\\Windows\\System32\\x.txt` or `C:\\x.txt`. `target / name`
    would honour both — pathlib discards the left operand entirely when the
    right one is absolute. A recon tool that writes outside the directory it was
    told to use would be a bad trade for a file listing.
    """
    candidate = Path(entry_name)
    if candidate.is_absolute() or candidate.drive or candidate.root:
        return None
    if ".." in candidate.parts:
        return None
    resolved = (target / candidate).resolve()
    try:
        resolved.relative_to(target.resolve())
    except ValueError:
        return None
    return resolved


def survey_extract(archives, report, out: dict, outdir: Path):
    report.head("Extracted text and config entries")
    target = outdir / "extracted"
    written = 0
    written_bytes = 0
    skipped = Counter()

    for archive in archives:
        for entry in archive.files:
            low = norm(entry.name)
            if Path(low).suffix not in EXTRACT_EXTS:
                continue
            if entry.real_size > EXTRACT_MAX_ENTRY:
                skipped["too large"] += 1
                continue
            if written >= EXTRACT_MAX_FILES or written_bytes >= EXTRACT_MAX_TOTAL:
                skipped["cap reached"] += 1
                continue
            try:
                data = archive.read(entry)
            except GrfEncrypted:
                skipped["encrypted — no key"] += 1
                continue
            except GrfUnsupported:
                skipped["archive format not supported for extraction"] += 1
                continue
            except GrfError:
                skipped["corrupt or truncated entry"] += 1
                continue
            dest = safe_destination(target, low)
            if dest is None:
                skipped["entry name escapes the output directory"] += 1
                continue
            try:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
            except OSError as exc:
                skipped[f"could not write ({exc.errno})"] += 1
                continue
            written += 1
            written_bytes += len(data)

    report.line(f"{written:,} entries written to `extracted/` ({human(written_bytes)})")
    if skipped:
        report.table(
            ["not extracted", "count"],
            [[reason, f"{count:,}"] for reason, count in skipped.most_common(15)],
        )
    report.line(
        "gitignored on purpose — this is their content, not our artifact "
        "(CLAUDE.md §2.3)"
    )
    out["extracted"] = {
        "files": written,
        "bytes": written_bytes,
        "skipped": dict(skipped),
    }


# =============================================================================
# report builder
# =============================================================================
class ReportBuilder:
    def __init__(self):
        self.lines = []

    def head(self, text):
        self.lines += ["", f"## {text}", ""]

    def sub(self, text):
        self.lines += ["", f"### {text}", ""]

    def line(self, text):
        self.lines += [text, ""]

    def bullets(self, items):
        self.lines += [f"- `{item}`" for item in items] + [""]

    def code(self, text, lang=""):
        body = text.replace("```", "'''").rstrip()
        self.lines += [f"```{lang}", body, "```", ""]

    def table(self, headers, rows):
        if not rows:
            self.lines += ["(nothing)", ""]
            return
        self.lines.append("| " + " | ".join(headers) + " |")
        self.lines.append("|" + "|".join("---" for _ in headers) + "|")
        for row in rows:
            cells = [str(c).replace("|", "\\|").replace("\n", " ") for c in row]
            self.lines.append("| " + " | ".join(cells) + " |")
        self.lines.append("")

    def text(self):
        return "\n".join(self.lines).rstrip() + "\n"


def what_this_means(out: dict, report):
    """The section that makes this a decision document rather than a data dump.

    Every finding above maps onto something CLAUDE.md is currently waiting on,
    and saying which is the difference between a survey and a pile of numbers.
    """
    report.head("What this changes for us")
    rows = []

    dates = Counter()
    protections = Counter()
    for exe in out.get("executables", []):
        dates.update(exe.get("dates", {}))
        dates.update(exe.get("packetver_candidates", {}))
        for label, hits in exe.get("protection", {}).items():
            protections[label] += hits
    if dates:
        top = ", ".join(d for d, _ in dates.most_common(3))
        rows.append(
            ["§3a Q1 — packetver", f"client date strings point at {top}",
             "sets our PACKETVER and the content baseline; we build 20180620 today"]
        )
    else:
        rows.append(
            ["§3a Q1 — packetver", "no date strings recovered (packed image)",
             "must come from the vendor or from packet capture instead"]
        )

    if protections:
        rows.append(
            ["§3a Q2 / §3b.1 — Gepard", ", ".join(sorted(protections)),
             "a second subscription if we match them; also why their GRF is locked"]
        )
    else:
        rows.append(
            ["§3a Q2 / §3b.1 — Gepard", "no protection markers found",
             "either unprotected, or packed well enough to hide it"]
        )

    addresses = list(
        dict.fromkeys(
            v
            for record in out.get("clientinfo", [])
            for v in record["fields"].get("address", [])
        )
    )
    if addresses:
        rows.append(
            ["§3c — origin exposure", f"client dials {', '.join(addresses)} directly",
             "confirms raw TCP to a public address; our position is the same"]
        )

    hosts = Counter()
    for exe in out.get("executables", []):
        hosts.update(exe.get("hosts", {}))
    if hosts:
        rows.append(
            ["Phase 5 — asset delivery", f"hosts named in the binary: "
             f"{', '.join(h for h, _ in hosts.most_common(5))}",
             "shows whether patching and assets come from a CDN or from origin"]
        )

    reg = [
        v
        for record in out.get("clientinfo", [])
        for v in record["fields"].get("registrationweb", [])
    ]
    if reg:
        rows.append(
            ["Phase 6 — registration", f"in-client registration points at {reg[0]}",
             "the §8a `สมัครไอดี` flow, confirmed from the client side"]
        )

    diff = out.get("diff")
    if diff:
        rows.append(
            ["Phase 4 — content", f"{diff['added']:,} files added over stock; "
             f"custom maps: {len(diff['custom_maps'])}",
             "this is the roster to match or deliberately differ from"]
        )

    caps = Counter()
    for exe in out.get("executables", []):
        caps.update(exe.get("capabilities", {}))
    if caps:
        rows.append(
            ["§8a — content era", ", ".join(k for k, _ in caps.most_common(6)),
             "replaces the screenshot-derived feature table with evidence"]
        )

    report.table(["CLAUDE.md", "what the client says", "consequence"], rows)
    report.line(
        "Every row above is read off their client. None of it is a vendor answer: "
        "`docs/vendor-roplay.md`'s eight questions still need RoPlay to answer them, "
        "and Q1 in particular should be *checked against* this, not replaced by it."
    )


# =============================================================================
def main():
    ap = argparse.ArgumentParser(
        description="Inventory a Ragnarok client folder and report what it says "
        "about the server behind it."
    )
    ap.add_argument("folder", help="the client folder (contains the .exe and GRFs)")
    ap.add_argument("--out", help="where to write the report (default: ./client-survey-<folder>)")
    ap.add_argument("--exe", help="analyse only this executable, relative to the folder")
    ap.add_argument("--max-exes", type=int, default=4,
                    help="how many executables to analyse (default 4)")
    ap.add_argument("--baseline", action="append", default=[], metavar="GRF",
                    help="a stock kRO archive to diff against; repeatable")
    ap.add_argument("--extract", action="store_true",
                    help="also write every unencrypted text/config entry to extracted/")
    args = ap.parse_args()

    # A Thai or Korean console encoding will otherwise kill the run partway
    # through printing an archive path. Report files are always utf-8.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    root = Path(args.folder).expanduser()
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 2

    outdir = Path(args.out) if args.out else Path.cwd() / f"client-survey-{root.name}"
    outdir.mkdir(parents=True, exist_ok=True)

    out = {
        "surveyed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tool": "tools/client-survey.py",
        "folder": {},
    }
    report = ReportBuilder()
    report.lines += [
        f"# Client survey — `{root.name}`",
        "",
        f"Produced by `tools/client-survey.py` at {out['surveyed_at']}.",
        f"Source folder: `{root}`",
        "",
        "Read-only. Nothing was decrypted and no protection was circumvented; "
        "where an archive is protected this says so and stops.",
    ]

    print(f"surveying {root}")
    files = survey_tree(root, report, out)
    print("  folder walked")
    archives = survey_archives(root, report, out, outdir, args)
    print(f"  {len(archives)} archive(s) read")
    survey_server_config(root, files, archives, report, out)
    survey_configs(root, files, report, out)
    survey_executables(root, report, out, args)
    print("  executables analysed")
    survey_diff(archives, report, out, outdir, args.baseline)
    if args.extract:
        survey_extract(archives, report, out, outdir)
        print("  entries extracted")
    what_this_means(out, report)

    (outdir / "report.md").write_text(report.text(), encoding="utf-8")
    (outdir / "survey.json").write_text(
        json.dumps(out, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )

    print()
    print(f"report:   {outdir / 'report.md'}")
    print(f"json:     {outdir / 'survey.json'}")
    print(f"manifest: {outdir / 'manifest'}")
    print()
    print("Send report.md back. It is the summary; the manifests are the detail")
    print("and stay on this machine unless asked for.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
