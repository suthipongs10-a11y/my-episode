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
            ("data\\msgstringtable.txt", b"\n".join(b"line %d#" % i for i in range(4000)), 0x01),
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
    check(
        (extracted / "data" / "msgstringtable.txt").is_file(),
        "a text entry was extracted",
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


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        root = tmp / "EternalRO-fixture"
        baseline = build_fixture(root)
        test_grflib(root)
        test_survey(root, baseline, tmp / "out")
        test_doctor(root)

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
