#!/usr/bin/env python3
# =============================================================================
# grflib — read a GRF/GPF archive's file table, and pull entries out of it
# =============================================================================
# The one GRF reader in this repo. `client-doctor.py` and `client-survey.py`
# both import it; there is deliberately no second copy, because two readers
# that disagree about a file table is a bug nobody finds until it matters.
#
# Format per roBrowser `src/Loaders/GameFile.js`. Standard library only — this
# has to run on a Windows box with a stock Python and no network.
#
# WHAT IT DELIBERATELY DOES NOT DO
#
# It does not decrypt. Two different things get called "an encrypted GRF":
#
#   * The format's own DES scrambling (entry type bits 0x02 / 0x04). Old, the
#     key is public, and roBrowser implements it. Almost nothing built after
#     ~2013 uses it, so it is not implemented here — if a survey ever reports a
#     meaningful number of DES-flagged entries, port it from roBrowser then.
#   * A protected server's archive (Gepard and friends), which is a different
#     scheme with a key we do not have and are not going to attack.
#
# In both cases the *file table* still reads fine, because the names are only
# zlib-compressed. That is the useful part: you can enumerate everything an
# archive contains without being able to open any of it.
# =============================================================================
from pathlib import Path
from typing import Dict, List, NamedTuple
import struct
import zlib

GRF_SIG = b"Master of Magic"
GRF_SIG_EH3 = b"Event Horizon"

# signature[15] + allow_encryption[15] + u32 table offset + u32 skip
# + u32 filecount + u32 version
HEADER_SIZE = 46

TYPE_FILE = 0x01
TYPE_ENCRYPT_MIXED = 0x02
TYPE_ENCRYPT_HEADER = 0x04
TYPE_ENCRYPTED = TYPE_ENCRYPT_MIXED | TYPE_ENCRYPT_HEADER

VERSION_200 = 0x200
VERSION_300 = 0x300


class GrfError(Exception):
    """The archive could not be read."""


class GrfEncrypted(GrfError):
    """The entry is there, but its bytes are scrambled and we have no key."""


class GrfUnsupported(GrfError):
    """A shape of archive this reader knows about but cannot handle."""


def norm(path: str) -> str:
    """One spelling for a game path.

    The client is case-insensitive and mixes separators freely, so
    `System/Towninfo.lub` and `system\\towninfo.lub` are the same file.
    Treating them as different is how you "lose" a file that is right there.
    """
    return path.replace("\\", "/").lstrip("./").lower()


def display(name: str) -> str:
    """A readable form of an entry name, for humans.

    Entry names are stored as bytes and decoded latin-1 so they round-trip
    losslessly, but a kRO archive is full of Korean cp949 directory names —
    `data/texture/À¯ÀúÀÎÅÍÆäÀÌ½º/` is `data/texture/유저인터페이스/` (the UI
    folder), and printing the mojibake makes a survey unreadable exactly where
    it is most interesting. Falls back to the raw form when it is not cp949.
    """
    try:
        return name.encode("latin-1").decode("cp949")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return name


class Entry(NamedTuple):
    name: str  # as stored, latin-1 decoded (lossless); see norm() / display()
    pack_size: int  # compressed bytes on disk
    length_aligned: int  # compressed bytes rounded up for DES block size
    real_size: int  # uncompressed bytes
    type: int  # TYPE_* bits
    offset: int  # relative to the end of the header, not the file start

    @property
    def is_file(self) -> bool:
        """Directories are listed too, with the file bit clear."""
        return bool(self.type & TYPE_FILE)

    @property
    def is_encrypted(self) -> bool:
        return bool(self.type & TYPE_ENCRYPTED)


class Archive:
    def __init__(self, path: Path, version: int, entries: List[Entry]):
        self.path = path
        self.version = version
        self.entries = entries
        self.by_name: Dict[str, Entry] = {norm(e.name): e for e in entries}

    def __len__(self) -> int:
        return len(self.entries)

    @property
    def files(self) -> List[Entry]:
        return [e for e in self.entries if e.is_file]

    @property
    def encrypted_count(self) -> int:
        return sum(1 for e in self.entries if e.is_encrypted)

    def get(self, name: str):
        return self.by_name.get(norm(name))

    def read(self, entry: Entry) -> bytes:
        return extract(self, entry)


def read_archive(path: Path) -> Archive:
    """Parse the header and the whole file table. Reads no entry contents, so
    this stays fast and low-memory on a 4 GB archive."""
    path = Path(path)
    with path.open("rb") as fp:
        head = fp.read(HEADER_SIZE)
        if len(head) < HEADER_SIZE:
            raise GrfError("file is shorter than a GRF header")

        signature = head[:15].split(b"\0")[0]
        if signature not in (GRF_SIG, GRF_SIG_EH3):
            raise GrfError(f"bad signature {signature!r} — not a GRF")

        table_offset, skip, filecount, version = struct.unpack("<IIII", head[30:46])

        if version == VERSION_300:
            fp.seek(30)
            table_offset = struct.unpack("<Q", fp.read(8))[0]
            realcount = struct.unpack("<I", fp.read(4))[0]
            table_at = table_offset + HEADER_SIZE + 4
        elif version == VERSION_200:
            realcount = filecount - skip - 7
            table_at = table_offset + HEADER_SIZE
        else:
            raise GrfUnsupported(
                f"unsupported version 0x{version:x} (only 0x200 and 0x300)"
            )

        if realcount < 0:
            raise GrfError("file table count is negative — header is corrupt")

        fp.seek(table_at)
        sizes = fp.read(8)
        if len(sizes) < 8:
            raise GrfError("file table offset points past the end of the file")
        pack_size, real_size = struct.unpack("<II", sizes)
        raw = fp.read(pack_size)
        if len(raw) < pack_size:
            raise GrfError("file table is truncated")
        try:
            table = zlib.decompress(raw)
        except zlib.error as exc:
            raise GrfError(f"file table would not inflate ({exc})") from exc
        if len(table) != real_size:
            raise GrfError(
                f"file table inflated to {len(table)}, header said {real_size}"
            )

    entries = []
    pos = 0
    for index in range(realcount):
        try:
            end = table.index(b"\0", pos)
        except ValueError as exc:
            raise GrfError(
                f"file table ended after {index} of {realcount} entries"
            ) from exc
        name = table[pos:end].decode("latin-1")
        pos = end + 1
        # One guard around both unpacks. It used to cover only the fixed 13
        # bytes, which left the offset field — the part this reader added when it
        # grew extraction — able to raise a bare struct.error out of the library
        # on a table truncated mid-entry. Callers catch GrfError; nothing catches
        # struct.error, so that surfaced as an unhandled traceback.
        try:
            packed, aligned, real, etype = struct.unpack_from("<IIIB", table, pos)
            pos += 13
            if version == VERSION_300:
                (offset,) = struct.unpack_from("<Q", table, pos)
                pos += 8
            else:
                (offset,) = struct.unpack_from("<I", table, pos)
                pos += 4
        except struct.error as exc:
            raise GrfError(
                f"entry {index} of {realcount} is truncated — the file table ends "
                f"mid-entry"
            ) from exc
        entries.append(Entry(name, packed, aligned, real, etype, offset))

    return Archive(path, version, entries)


def extract(archive: Archive, entry: Entry) -> bytes:
    """The entry's real bytes, or a GrfError explaining why not."""
    if not entry.is_file:
        raise GrfError(f"{entry.name} is a directory entry, not a file")
    if entry.is_encrypted:
        raise GrfEncrypted(
            f"{entry.name} is encrypted (type 0x{entry.type:02x}) — no key"
        )
    if archive.version != VERSION_200:
        raise GrfUnsupported(
            f"extraction from v0x{archive.version:x} archives is not implemented"
        )
    if entry.real_size == 0:
        return b""

    with archive.path.open("rb") as fp:
        fp.seek(HEADER_SIZE + entry.offset)
        raw = fp.read(entry.pack_size)
    if len(raw) < entry.pack_size:
        raise GrfError(f"{entry.name}: entry data is truncated")
    try:
        data = zlib.decompress(raw)
    except zlib.error as exc:
        # A wrong offset inflates to garbage far more often than it throws, so
        # the size check below matters as much as this one.
        raise GrfError(f"{entry.name}: would not inflate ({exc})") from exc
    if len(data) != entry.real_size:
        raise GrfError(
            f"{entry.name}: inflated to {len(data)}, table said {entry.real_size}"
        )
    return data


# --- backwards-compatible shim ------------------------------------------------
def read_grf_entries(path: Path):
    """(name -> type byte, version). What `client-doctor.py` has always used."""
    archive = read_archive(path)
    return {norm(e.name): e.type for e in archive.entries}, archive.version
