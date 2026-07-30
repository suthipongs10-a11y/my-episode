#!/usr/bin/env python3
# =============================================================================
# test-client-survey — prove the recon tooling works before it is trusted
# =============================================================================
# Runs on Linux in CI. Builds a synthetic client folder — a real GRF archive
# written byte by byte, and a real PE32 executable with planted strings — then
# runs grflib, client-survey.py and client-doctor.py against it and checks what
# they report.
#
# WHY THIS EXISTS
#
# CLAUDE.md §12: "the thing that stops a client from starting is invisible by
# construction, and the answer both times was to build the instrument before
# continuing to guess." An instrument nobody calibrated is the same problem one
# level up. `client-survey.py` is meant to be run once, on a Windows box, on a
# folder that only exists there — so a bug in it costs a round trip through a
# human. The archive and executable formats are fully specified, which means
# the tool can be tested here, completely, without either.
#
# It also pins the two bugs that made the reader wrong before: a v0x200 file
# count is `filecount - skip - 7`, and entry offsets are relative to the end of
# the 46-byte header rather than to the start of the file.
# =============================================================================
import contextlib
import importlib.util
import io
import json
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))

import grflib  # noqa: E402


def load_survey_module():
    """client-survey.py as an importable module, so the resilience checks can
    reach individual functions. The hyphen in the filename is why this needs
    importlib rather than a plain import."""
    spec = importlib.util.spec_from_file_location(
        "client_survey", TOOLS / "client-survey.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

FAILURES = []
CHECKS = 0


def check(condition, description):
    global CHECKS
    CHECKS += 1
    if condition:
        print(f"  ok    {description}")
    else:
        print(f"  FAIL  {description}")
        FAILURES.append(description)


def section(title):
    print(f"\n== {title}")


# =============================================================================
# synthetic GRF
# =============================================================================
def build_grf(path: Path, files):
    """Write a real v0x200 archive. `files` is [(name, data, type_bits)].

    Layout: 46-byte header, then every entry's deflated bytes back to back,
    then the deflated file table. Entry offsets are relative to the end of the
    header, which is the detail that silently produces garbage when wrong.
    """
    body = b""
    table = b""
    for name, data, etype in files:
        compressed = zlib.compress(data) if data else b""
        table += name.encode("latin-1") + b"\0"
        table += struct.pack(
            "<IIIBI", len(compressed), len(compressed), len(data), etype, len(body)
        )
        body += compressed

    packed_table = zlib.compress(table)
    header = b"Master of Magic".ljust(15, b"\0") + b"\0" * 15
    # table offset is relative to the end of the header; skip=0 so the count
    # rule is filecount - 0 - 7.
    header += struct.pack("<IIII", len(body), 0, len(files) + 7, 0x200)
    path.write_bytes(
        header + body + struct.pack("<II", len(packed_table), len(table)) + packed_table
    )


def build_grf_v300(path: Path, files):
    """The other archive shape grflib claims to read: 8-byte entry offsets, the
    table offset as a u64 at byte 30, the real count as a u32 at 38, and four
    bytes of padding before the table (`table_offset + 46 + 4`).

    Untested until now, which was the wrong way round — it is the branch with
    the unusual arithmetic, so it is the branch where an error hides.
    """
    body = b""
    table = b""
    for name, data, etype in files:
        compressed = zlib.compress(data) if data else b""
        table += name.encode("latin-1") + b"\0"
        table += struct.pack("<IIIB", len(compressed), len(compressed), len(data), etype)
        table += struct.pack("<Q", len(body))
        body += compressed

    packed_table = zlib.compress(table)
    header = b"Master of Magic".ljust(15, b"\0") + b"\0" * 15
    # u64 offset at 30 spans what v0x200 reads as (table_offset, skip); the
    # count sits at 38 and the version at 42.
    header += struct.pack("<QII", len(body), len(files), 0x300)
    path.write_bytes(
        header
        + body
        + b"\0" * 4
        + struct.pack("<II", len(packed_table), len(table))
        + packed_table
    )


def build_grf_raw_table(path: Path, table: bytes, count: int):
    """An archive whose file table is exactly the bytes given. Lets a test hand
    over a table that stops in the middle of an entry."""
    packed = zlib.compress(table)
    header = b"Master of Magic".ljust(15, b"\0") + b"\0" * 15
    header += struct.pack("<IIII", 0, 0, count + 7, 0x200)
    path.write_bytes(header + struct.pack("<II", len(packed), len(table)) + packed)


# =============================================================================
# synthetic PE32
# =============================================================================
def build_pe(strings: bytes, section_name: bytes = b".text", pad_to: int = 0) -> bytes:
    """A structurally valid 32-bit PE with one section, one import descriptor
    naming kernel32.dll, and `strings` planted in the section body.

    `pad_to` inflates the image to a realistic size. It matters: both tools
    filter which executables they will read by file size, so a 1 KB fixture
    silently exercises neither of those code paths.
    """
    dll_name = b"kernel32.dll\0"
    # payload: import descriptors (one real, one null terminator), dll name,
    # then the planted strings.
    descriptors = struct.pack("<IIIII", 0, 0, 0, 0x1000 + 40, 0) + b"\0" * 20
    payload = descriptors.ljust(40, b"\0") + dll_name.ljust(20, b"\0") + strings
    if pad_to:
        payload = payload.ljust(pad_to, b"\0")

    opt_size = 0xE0  # 96 header bytes + 16 data directories * 8
    pe_at = 0x80
    sec_at = pe_at + 4 + 20 + opt_size
    raw_at = 0x400

    dos = b"MZ" + b"\0" * (0x3C - 2) + struct.pack("<I", pe_at)
    dos = dos.ljust(pe_at, b"\0")

    coff = struct.pack(
        "<HHIIIHH",
        0x14C,  # i386
        1,  # one section
        0x5B29B000,  # a plausible 2018 link timestamp
        0,
        0,
        opt_size,
        0x102,  # executable, 32-bit
    )

    opt = struct.pack("<H", 0x10B)  # PE32
    opt += b"\x0e\x00"  # linker version
    opt += struct.pack("<III", len(payload), 0, 0)  # sizes of code/data
    opt += struct.pack("<I", 0x1000)  # AddressOfEntryPoint  (opt+16)
    opt += struct.pack("<II", 0x1000, 0x2000)  # BaseOfCode, BaseOfData
    opt += struct.pack("<I", 0x400000)  # ImageBase
    opt += struct.pack("<II", 0x1000, 0x200)  # section / file alignment
    opt += struct.pack("<HHHHHH", 5, 1, 0, 0, 5, 1)  # os / image / subsystem vers
    opt += struct.pack("<I", 0)  # Win32VersionValue
    opt += struct.pack("<III", 0x10000, 0x400, 0)  # SizeOfImage/Headers/CheckSum
    opt += struct.pack("<HH", 2, 0)  # Subsystem = Windows GUI  (opt+68)
    opt += struct.pack("<IIII", 0x100000, 0x1000, 0x100000, 0x1000)  # stack/heap
    opt += struct.pack("<I", 0)  # LoaderFlags
    opt += struct.pack("<I", 16)  # NumberOfRvaAndSizes  (opt+92)
    dirs = [(0, 0)] * 16
    dirs[1] = (0x1000, 40)  # import table
    for rva, size in dirs:
        opt += struct.pack("<II", rva, size)
    assert len(opt) == opt_size, len(opt)

    section = struct.pack(
        "<8sIIIIIIHHI",
        section_name.ljust(8, b"\0")[:8],
        len(payload),  # VirtualSize
        0x1000,  # VirtualAddress
        len(payload),  # SizeOfRawData
        raw_at,  # PointerToRawData
        0,
        0,
        0,
        0,
        0x60000020,  # code, execute, read
    )

    image = dos + b"PE\0\0" + coff + opt + section
    assert len(image) <= raw_at, f"headers overflow into section data ({len(image)})"
    return image.ljust(raw_at, b"\0") + payload


# =============================================================================
# the fixture
# =============================================================================
KOREAN_UI_DIR = "data\\texture\\유저인터페이스".encode("cp949").decode("latin-1")

CLIENTINFO = """<?xml version="1.0" encoding="euc-kr" ?>
<clientinfo>
  <servicetype>korea</servicetype>
  <servertype>primary</servertype>
  <extendedslot>1</extendedslot>
  <connection>
    <display>Test Origin</display>
    <address>203.0.113.77</address>
    <port>6900</port>
    <version>55</version>
    <langtype>1</langtype>
    <registrationweb>https://test-origin.example.com/register</registrationweb>
    <loading><image>loading00.jpg</image></loading>
  </connection>
</clientinfo>
"""

# Big enough to compress, and the second entry in the archive so its offset is
# nonzero — which is what makes it the entry worth checking the *contents* of.
MSGTABLE = b"\n".join(b"line %d#" % i for i in range(4000))

# Planted so the survey has something definite to find: a client date in both
# spellings, an anti-cheat name, a patch host, a manager name, a lua path, and
# a capability marker. The UTF-16 string proves the wide-string sweep works.
EXE_STRINGS = (
    b"2018-06-20eRagexeRE\0"
    b"20180620\0"
    b"gepard.dll\0"
    b"CThemidaMgr\0"
    b"CCashShopMgr\0"
    b"System/Towninfo.lub\0"
    b"data\\clientinfo.xml\0"
    b"https://patch.test-origin.example.com/patch/patch2.txt\0"
    b"achievement_list.lub\0"
    + "v3hunt.dll".encode("utf-16-le")
    + b"\0\0"
)


def build_fixture(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    (root / "data").mkdir(exist_ok=True)
    (root / "data" / "clientinfo.xml").write_text(CLIENTINFO, encoding="utf-8")
    (root / "DATA.INI").write_text(
        "[Data]\n0=custom.grf\n1=data.grf\n", encoding="utf-8"
    )
    (root / "patcher.ini").write_text(
        "[Main]\npatch_url=https://patch.test-origin.example.com/\n"
        "password=hunter2\n",
        encoding="utf-8",
    )
    # Deflated, not text. EternalRO's rag.dat was 49 bytes of zlib and the first
    # survey printed it as mojibake, which reads like a corrupt file rather than
    # one nobody had opened.
    (root / "rag.dat").write_bytes(zlib.compress(b"deflated-marker-value"))
    # Over client-doctor.py's 512 KB floor on purpose, so its executable path
    # runs too.
    (root / "Ep4RO.exe").write_bytes(build_pe(EXE_STRINGS, pad_to=700_000))
    (root / "gepard.dll").write_bytes(b"MZ" + b"\0" * 4096)

    # Their archive: shares two entries with stock, adds three of its own, has
    # one encrypted entry and one directory entry.
    build_grf(
        root / "data.grf",
        [
            ("data\\clientinfo.xml", CLIENTINFO.encode("utf-8"), 0x01),
            ("data\\msgstringtable.txt", MSGTABLE, 0x01),
            ("data\\prontera.rsw", b"stock prontera", 0x01),
            ("data\\custom_town.rsw", b"their own map", 0x01),
            (KOREAN_UI_DIR + "\\login_interface.bmp", b"BM" + b"\0" * 200, 0x01),
            ("data\\locked_secret.txt", b"you cannot read me", 0x03),
            ("data\\sprite", b"", 0x00),
            # A hostile entry name. Nothing in the format forbids one, and
            # --extract writes entries out by name, so the survey has to refuse
            # this rather than honour it. The `..` is deliberately not leading:
            # grflib.norm() strips leading dots and slashes, so `..\\x.txt`
            # would be flattened to `x.txt` and never reach the guard.
            ("data\\..\\..\\escaped.txt", b"should never be written", 0x01),
        ],
    )
    build_grf(
        root / "custom.grf",
        [("data\\extra_npc.spr", b"a custom sprite", 0x01)],
    )

    stock = root.parent / "stock"
    stock.mkdir(exist_ok=True)
    build_grf(
        stock / "data.grf",
        [
            ("data\\clientinfo.xml", b"<clientinfo/>", 0x01),
            ("data\\prontera.rsw", b"stock prontera which is a different size", 0x01),
            ("data\\payon.rsw", b"stock payon", 0x01),
        ],
    )
    return stock / "data.grf"


# =============================================================================
def test_grflib(root: Path):
    section("grflib reads the archive it was given")
    archive = grflib.read_archive(root / "data.grf")

    check(len(archive) == 8, f"all 8 entries parsed (got {len(archive)})")
    check(len(archive.files) == 7, f"7 of them are files (got {len(archive.files)})")
    check(archive.version == 0x200, "version reported as 0x200")
    check(archive.encrypted_count == 1, f"1 encrypted entry (got {archive.encrypted_count})")

    entry = archive.get("DATA/ClientInfo.XML")
    check(entry is not None, "lookup is case- and separator-insensitive")
    if entry:
        check(
            archive.read(entry).decode("utf-8") == CLIENTINFO,
            "an entry round-trips through compression byte for byte",
        )

    table = archive.get("data/msgstringtable.txt")
    check(table is not None and table.real_size > 20000, "sizes come back from the table")
    # The check that actually pins the offset base. The clientinfo round-trip
    # above is the *first* entry, whose offset is 0 — it reads correctly whether
    # the reader seeks to `offset` or to `46 + offset`. This one does not.
    if table:
        check(table.offset > 0, f"it sits at a nonzero offset ({table.offset})")
        check(
            archive.read(table) == MSGTABLE,
            "an entry at a nonzero offset extracts byte for byte — the offset is "
            "relative to the end of the 46-byte header",
        )

    locked = archive.get("data/locked_secret.txt")
    check(locked is not None and locked.is_encrypted, "the encrypted entry is flagged")
    if locked:
        try:
            archive.read(locked)
            check(False, "reading an encrypted entry raises")
        except grflib.GrfEncrypted:
            check(True, "reading an encrypted entry raises GrfEncrypted")
        except grflib.GrfError as exc:
            check(False, f"raised the wrong error: {exc}")

    korean = archive.get(KOREAN_UI_DIR + "/login_interface.bmp")
    check(korean is not None, "a cp949 entry name survives normalisation")
    if korean:
        check(
            "유저인터페이스" in grflib.display(korean.name),
            "display() renders the Korean UI folder readably",
        )

    entries, version = grflib.read_grf_entries(root / "data.grf")
    check(
        len(entries) == 8 and version == 0x200,
        "the client-doctor shim still returns (dict, version)",
    )

    section("grflib refuses what it cannot read")
    junk = root / "junk.grf"
    junk.write_bytes(b"not a grf at all" + b"\0" * 64)
    try:
        grflib.read_archive(junk)
        check(False, "a non-GRF is rejected")
    except grflib.GrfError:
        check(True, "a non-GRF is rejected with GrfError")
    junk.unlink()

    short = root / "short.grf"
    short.write_bytes(b"Master of Magic")
    try:
        grflib.read_archive(short)
        check(False, "a truncated header is rejected")
    except grflib.GrfError:
        check(True, "a truncated header is rejected with GrfError")
    short.unlink()

    # The gap that let a real bug through: only a truncated *header* was ever
    # tested, so a table that stops mid-entry was never exercised. It raised a
    # bare struct.error out of the library, which no caller catches, so it
    # surfaced as an unhandled traceback instead of a reported problem.
    cut = root / "cut-table.grf"
    for label, table in (
        ("after the name", b"data\\a.txt\0"),
        ("mid-metadata", b"data\\a.txt\0" + b"\0" * 6),
        # The exact shape the guard used to miss: all 13 fixed bytes present,
        # the 4-byte offset absent.
        ("after the metadata, before the offset", b"data\\a.txt\0" + b"\0" * 13),
    ):
        build_grf_raw_table(cut, table, 1)
        try:
            grflib.read_archive(cut)
            check(False, f"a table cut {label} is rejected")
        except grflib.GrfError:
            check(True, f"a table cut {label} is rejected with GrfError")
        except struct.error:
            check(False, f"a table cut {label} leaked a raw struct.error")
    cut.unlink()

    empty = root / "empty.grf"
    build_grf(empty, [])
    try:
        archive = grflib.read_archive(empty)
        check(len(archive) == 0, "an archive with no entries reads as empty")
    except grflib.GrfError as exc:
        check(False, f"an archive with no entries should read as empty: {exc}")
    empty.unlink()

    section("grflib reads the v0x300 shape too")
    v3 = root / "v300.grf"
    build_grf_v300(v3, [
        ("data\\first.txt", b"first entry, offset zero", 0x01),
        ("data\\second.txt", b"second entry, at a nonzero offset", 0x01),
    ])
    try:
        archive = grflib.read_archive(v3)
        check(archive.version == 0x300, "the version is reported as 0x300")
        check(len(archive) == 2, f"both entries parsed (got {len(archive)})")
        check(
            archive.get("data/second.txt") is not None,
            "the 8-byte offset field did not desynchronise the table",
        )
        entry = archive.get("data/second.txt")
        if entry:
            try:
                archive.read(entry)
                check(False, "extraction from v0x300 is refused")
            except grflib.GrfUnsupported:
                check(True, "extraction from v0x300 raises GrfUnsupported")
    except grflib.GrfError as exc:
        check(False, f"a v0x300 archive should be readable: {exc}")
    v3.unlink()


def run(script: str, *args):
    proc = subprocess.run(
        [sys.executable, str(TOOLS / script), *args],
        capture_output=True,
        text=True,
    )
    return proc


def test_survey(root: Path, baseline: Path, outdir: Path):
    section("client-survey.py produces a report")
    proc = run(
        "client-survey.py",
        str(root),
        "--out",
        str(outdir),
        "--baseline",
        str(baseline),
        "--extract",
    )
    check(proc.returncode == 0, f"exit code 0 (got {proc.returncode})")
    if proc.returncode != 0:
        print(proc.stdout[-3000:])
        print(proc.stderr[-3000:], file=sys.stderr)
        return

    report_path = outdir / "report.md"
    check(report_path.is_file(), "report.md written")
    report = report_path.read_text(encoding="utf-8")
    data = json.loads((outdir / "survey.json").read_text(encoding="utf-8"))

    section("... and the report says the things that matter")
    check("203.0.113.77" in report, "the server address the client dials is reported")
    check("6900" in report, "the port is reported")
    check(
        "test-origin.example.com/register" in report,
        "the in-client registration URL is reported",
    )
    check("2018-06-20" in report, "the client date string is reported")
    check("20180620" in report, "the packetver-shaped date is reported")
    check("Gepard Shield" in report, "Gepard is named as a protection marker")
    check(
        "v3hunt" in report.lower(),
        "a UTF-16-only string is found (the wide-string sweep works)",
    )
    check("Cash shop" in report, "a capability marker is reported")
    check(
        "patch.test-origin.example.com" in report,
        "the patch host is reported (Phase 5 intel)",
    )
    check("i386 (32-bit)" in report, "the PE machine type is reported")
    check("kernel32.dll" in report, "the import table was walked")
    check("유저인터페이스" in report, "the Korean UI folder renders readably")
    check(
        "1 entries are encrypted" in report or "**1 entries are encrypted**" in report,
        "the encrypted entry is called out",
    )
    check("<redacted>" in report, "a password in a config file is redacted")
    check("hunter2" not in report, "... and its value does not appear anywhere")
    check(
        "deflated-marker-value" in report,
        "a zlib-compressed loose config is inflated rather than printed as mojibake",
    )
    check(
        "203.0.113.77, 203.0.113.77" not in report,
        "the same address found twice is reported once, not as two servers",
    )

    section("... and the structured output agrees")
    archives = {a["name"]: a for a in data["archives"]}
    check(set(archives) == {"data.grf", "custom.grf"}, "both archives surveyed")
    check(archives["data.grf"]["entries"] == 8, "entry count in json")
    check(archives["data.grf"]["encrypted"] == 1, "encrypted count in json")
    check(archives["data.grf"]["map_count"] == 2, "map roster counted (.rsw)")
    check(data["data_ini"] == ["custom.grf", "data.grf"], "DATA.INI order recorded")

    exe = data["executables"][0]
    # Asserted against the structured record rather than the report text on
    # purpose. The first version of this test looked for "2018-06-20" anywhere
    # in report.md and passed while the date sweep was broken, because the PE
    # link timestamp renders in that same form. The bug it hid: the regex ended
    # in \b, and the client date lives in `2018-06-20eRagexeRE`, where a letter
    # follows the digits and there is no boundary to match.
    check(
        "2018-06-20" in exe["dates"],
        "the hyphenated client date is recovered even with a letter glued to it",
    )
    check(
        "20180620" in exe["packetver_candidates"],
        "the packetver-shaped date is recovered",
    )
    check(exe["pe"]["bits"] == 32, "PE parsed as 32-bit")
    check("kernel32.dll" in exe["pe"]["imports"], "import recorded in json")
    check("CCashShopMgr" in exe["managers"], "manager names collected")
    check("Gepard Shield" in exe["protection"], "protection recorded in json")

    diff = data["diff"]
    # Theirs and not stock's: msgstringtable.txt, custom_town.rsw, the Korean
    # bmp, locked_secret.txt and extra_npc.spr from the second archive. An
    # encrypted entry still counts as a file they ship — we can see that it is
    # there, which is the whole point of reading the table rather than the data.
    # Changed: prontera.rsw and clientinfo.xml, both different sizes from stock.
    # Removed: payon.rsw, which stock has and they do not.
    check(diff["added"] == 6, f"6 files they added over stock (got {diff['added']})")
    check(diff["changed"] == 2, f"2 same-name-different-size (got {diff['changed']})")
    check(diff["removed"] == 1, f"1 stock file absent (got {diff['removed']})")
    check(diff["custom_maps"] == ["custom_town"], "their custom map is isolated")

    section("... and extraction pulled the text out, but not the locked entry")
    extracted = outdir / "extracted"
    extracted_table = extracted / "data" / "msgstringtable.txt"
    check(extracted_table.is_file(), "a text entry was extracted")
    if extracted_table.is_file():
        check(
            extracted_table.read_bytes() == MSGTABLE,
            "and its contents are right, not merely present",
        )
    check(
        not (extracted / "data" / "locked_secret.txt").exists(),
        "the encrypted entry was not extracted",
    )
    check(
        data["extracted"]["skipped"].get("encrypted — no key") == 1,
        "and it is accounted for as encrypted rather than silently dropped",
    )

    section("... and a hostile entry name did not escape the output directory")
    check(
        data["extracted"]["skipped"].get("entry name escapes the output directory") == 1,
        "the `data/../../escaped.txt` entry was refused",
    )
    for candidate in (
        outdir / "escaped.txt",
        outdir.parent / "escaped.txt",
        outdir.parent.parent / "escaped.txt",
        outdir / "extracted" / "escaped.txt",
    ):
        check(not candidate.exists(), f"nothing was written to {candidate.name} at {candidate.parent.name or '/'}")
    check(
        (outdir / "manifest" / "data.txt").is_file(),
        "a full entry manifest was written",
    )
    manifest = (outdir / "manifest" / "data.txt").read_text(encoding="utf-8")
    check(manifest.count("\n") >= 10, "the manifest lists every entry")
    check(
        (outdir / "diff" / "added.txt").is_file(),
        "the full added-file list was written",
    )


def test_resilience(root: Path, outdir: Path):
    """The failure modes that cost a round trip through a human.

    This tool runs once, on a machine whoever wrote the bug cannot reach. A
    traceback there is worth nothing; a partial report is worth a lot.
    """
    cs = load_survey_module()

    section("pe_info survives a malformed executable")
    for label, blob in (
        ("random bytes", b"not an executable at all" * 4),
        ("MZ but nothing else", b"MZ" + b"\0" * 200),
        ("PE header pointing off the end", b"MZ" + b"\0" * 58 + struct.pack("<I", 0xFFFF)),
        ("a bogus optional-header size", bytearray(build_pe(b"x", pad_to=2048))),
        ("truncated mid-section-table", build_pe(b"x", pad_to=2048)[:0x120]),
    ):
        if label.startswith("a bogus"):
            blob[0x80 + 4 + 16] = 0xFF  # opt_size = huge
            blob = bytes(blob)
        try:
            info = cs.pe_info(blob)
            check(
                isinstance(info, dict),
                f"{label}: reported rather than raised"
                + (f" ({info.get('error', 'parsed')})" if "error" in info else ""),
            )
        except Exception as exc:  # noqa: BLE001 — that is the thing under test
            check(False, f"{label}: raised {type(exc).__name__}: {exc}")

    section("an unreadable file costs one line, not the run")
    report = cs.ReportBuilder()
    # A directory raises IsADirectoryError from read_bytes() — an OSError, like
    # a permission denial or a file locked by a running client, and one that
    # reproduces without needing to drop privileges.
    check(
        cs.read_or_report(root / "data", report, "a directory") is None,
        "read_or_report returns None instead of raising",
    )
    check(
        "could not read" in report.text(),
        "and it says so in the report",
    )

    section("a report is written even when a stage throws")
    victim = outdir / "partial"
    original = cs.what_this_means

    def explode(*_args, **_kwargs):
        raise RuntimeError("deliberate failure, injected by the test")

    cs.what_this_means = explode
    try:
        argv = sys.argv
        sys.argv = ["client-survey.py", str(root), "--out", str(victim)]
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                code = cs.main()
        finally:
            sys.argv = argv
    finally:
        cs.what_this_means = original

    check(code == 1, f"main() reports failure with exit 1 (got {code})")
    check((victim / "report.md").is_file(), "report.md was still written")
    if (victim / "report.md").is_file():
        partial = (victim / "report.md").read_text(encoding="utf-8")
        check("The survey did not finish" in partial, "it says the run stopped early")
        check("deliberate failure" in partial, "it names the failure")
        check(
            "## Archives" in partial and "203.0.113.77" in partial,
            "and it still holds everything found before the failure",
        )
    if (victim / "survey.json").is_file():
        data = json.loads((victim / "survey.json").read_text(encoding="utf-8"))
        check("error" in data, "survey.json records the error")
        check(bool(data.get("archives")), "and the findings collected so far")
    else:
        check(False, "survey.json was still written")


def test_doctor(root: Path):
    section("client-doctor.py still works on the same folder")
    proc = run("client-doctor.py", str(root))
    check(
        proc.returncode in (0, 1),
        f"ran to a verdict rather than crashing (exit {proc.returncode})",
    )
    check("data.grf" in proc.stdout, "it read the archive through grflib")
    # The fixture has msgstringtable.txt only inside the archive, and the doctor
    # exists to say so: without a loose copy there is nothing to lengthen, which
    # is step 2 of docs/client-debug-plan.md.
    check(
        "only inside a GRF" in proc.stdout,
        "it notices the string table has no loose copy",
    )
    check("1 entries are ENCRYPTED" in proc.stdout, "it flags the encrypted entry")
    if proc.returncode not in (0, 1):
        print(proc.stdout[-2000:])
        print(proc.stderr[-2000:], file=sys.stderr)


def test_doctor_unreadable_payload(tmp: Path):
    """A readable table over an unreadable payload must be called out.

    This is the exact false positive that cost 2026-07-30. The doctor said
    "zero startup files missing" for a folder whose every archive entry was
    unreadable, because it only ever checked that a NAME was in the table. An
    archive's table is only zlib-compressed, so a protected GRF lists its
    contents perfectly while yielding nothing.
    """
    section("an archive with a good table and a scrambled payload")
    root = tmp / "ScrambledClient"
    root.mkdir(parents=True, exist_ok=True)
    (root / "DATA.INI").write_text("[Data]\n0=data.grf\n", encoding="utf-8")
    (root / "Ep4RO.exe").write_bytes(build_pe(EXE_STRINGS, pad_to=700_000))
    grf = root / "data.grf"
    build_grf(grf, [
        ("data\\msgstringtable.txt", b"x" * 4000, 1),
        ("data\\resnametable.txt", b"y" * 400, 1),
    ])
    # Entry data begins right after the 46-byte header. Replace the first entry's
    # opening bytes so the table still points at it but zlib cannot inflate it —
    # which is what a payload-encrypting packer looks like from outside.
    raw = bytearray(grf.read_bytes())
    raw[46:54] = b"\xde\xad\xbe\xef\xde\xad\xbe\xef"
    grf.write_bytes(bytes(raw))

    proc = run("client-doctor.py", str(root))
    check(proc.returncode in (0, 1), f"ran to a verdict (exit {proc.returncode})")
    check("Reading actual bytes out of the archive" in proc.stdout,
          "the doctor now reads bytes, not just names")
    check("could NOT be read" in proc.stdout,
          "it reports that entries could not be read")
    check("first bytes: de ad be ef" in proc.stdout,
          "and shows the bytes, so the cause is visible rather than inferred")
    check("encrypted or scrambled" in proc.stdout,
          "it names the likely cause")
    check("roBrowser cannot use it" in proc.stdout,
          "and says what that means for the client we actually ship")
    if proc.returncode not in (0, 1):
        print(proc.stdout[-2000:])


def test_host_classification():
    """The first EternalRO report listed cacerts.digicert.com as evidence about
    their asset delivery. It is in every signed binary ever built. Presenting it
    as a finding did not merely add noise — it hid the real one, that the patch
    host is not in the executable at all."""
    section("stock hosts are separated from the server's own")
    module = load_survey_module()

    for host in (
        "cacerts.digicert.com",
        "kro-acc1.ragnarok.co.kr",
        "admtools.gnjoy.com",
        "member.onstove.com",
        "lua.org",
        "schemas.microsoft.com",
    ):
        check(module.is_boilerplate_host(host), f"{host} is recognised as stock")

    for host in ("patch.eternal-origin.com", "cdn.some-private-server.net"):
        check(not module.is_boilerplate_host(host), f"{host} is kept as a real finding")

    check(
        module.url_is_boilerplate("https://cs.onstove.com/service/RAGNAROK_IND"),
        "a whole URL of stock hosts is labelled stock",
    )
    check(
        not module.url_is_boilerplate("http://patch.example-server.com/patch.txt"),
        "a URL naming an unknown host is not labelled stock",
    )
    check(
        not module.is_boilerplate_host("ragnarok.co.kr.evil.example"),
        "suffix matching cannot be fooled by a lookalike domain",
    )


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        root = tmp / "EternalRO-fixture"
        baseline = build_fixture(root)
        test_grflib(root)
        test_survey(root, baseline, tmp / "out")
        test_resilience(root, tmp / "out")
        test_doctor(root)
        test_doctor_unreadable_payload(tmp)
        test_host_classification()

    print()
    if FAILURES:
        print(f"{len(FAILURES)} of {CHECKS} checks FAILED:")
        for failure in FAILURES:
            print(f"  - {failure}")
        return 1
    print(f"all {CHECKS} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
