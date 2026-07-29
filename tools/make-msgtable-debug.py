#!/usr/bin/env python3
# =============================================================================
# make-msgtable-debug — turn the empty Error box into a number
# =============================================================================
#   python make-msgtable-debug.py "C:\Games\CleanTest\data\msgstringtable.txt"
#   python make-msgtable-debug.py <path> --pad 6000
#   python make-msgtable-debug.py <path> --restore
#
# THE IDEA
#
# The client reports errors by looking up a message *index* in
# data/msgstringtable.txt and showing whatever string is at that position. When
# the index is past the end of the file, the lookup yields nothing and you get
# a message box with a title and no text. docs/phase-1-client.md identified this
# and filed it as "the whole difficulty".
#
# It is not a difficulty. It is a lever. If every entry in the table announces
# its own index, then the box that said nothing says `[1837]` instead — and an
# index is something you can look up, compare against a stock table, and search
# for. One run converts a dead end into a lead.
#
# This rewrites the table so entry N reads:
#
#     [N] original text#
#
# and extends it well past the end with placeholders, so an index that used to
# fall off the end now lands on a labelled line.
#
# The original is kept as msgstringtable.txt.orig; --restore puts it back.
#
# CAVEAT, stated plainly: this deliberately corrupts UI text. Menus and system
# messages will have [numbers] in front of them. It is a diagnostic build, not
# something to ship — restore before you give the client to anyone.
# =============================================================================
import argparse
import shutil
import sys
from pathlib import Path

# The client's separator. Entries are '<text>#', newline-delimited in practice.
SEP = b"#"


def split_entries(raw: bytes):
    """Split the table into entries without decoding.

    The file may be cp949, cp874 or cp1252 depending on which region's client
    it came from, and guessing wrong mangles every non-ASCII string. Bytes in,
    bytes out — the only thing being changed is an ASCII prefix.
    """
    # Normalise line endings for splitting, remember which to write back.
    crlf = b"\r\n" in raw
    body = raw.replace(b"\r\n", b"\n")
    lines = body.split(b"\n")
    if lines and lines[-1] == b"":
        lines.pop()
    return lines, crlf


def main():
    ap = argparse.ArgumentParser(
        description="Label every msgstringtable entry with its index so error boxes stop being empty."
    )
    ap.add_argument("path", help="path to data/msgstringtable.txt")
    ap.add_argument("--pad", type=int, default=6000,
                    help="extend the table to at least this many entries (default 6000)")
    ap.add_argument("--restore", action="store_true",
                    help="put the original file back and exit")
    args = ap.parse_args()

    path = Path(args.path)
    backup = path.with_suffix(path.suffix + ".orig")

    if args.restore:
        if not backup.is_file():
            print(f"no backup at {backup} — nothing to restore", file=sys.stderr)
            return 1
        shutil.copyfile(backup, path)
        print(f"restored {path} from {backup}")
        return 0

    if not path.is_file():
        print(f"not found: {path}", file=sys.stderr)
        print("If msgstringtable.txt only exists inside a GRF, extract it to", file=sys.stderr)
        print("data/msgstringtable.txt first — a loose copy wins over the archive.", file=sys.stderr)
        return 2

    raw = path.read_bytes()
    lines, crlf = split_entries(raw)
    original_count = len(lines)

    if not backup.is_file():
        shutil.copyfile(path, backup)
        print(f"original saved to {backup.name}")
    else:
        print(f"{backup.name} already exists — keeping the first original, not overwriting")
        # Re-label from the pristine copy so running twice does not double-prefix.
        lines, crlf = split_entries(backup.read_bytes())
        original_count = len(lines)

    out = []
    for i, line in enumerate(lines):
        text = line[:-1] if line.endswith(SEP) else line
        out.append(b"[%d] " % i + text + SEP)

    for i in range(len(lines), max(args.pad, len(lines))):
        out.append(b"[%d] <past end of original table>" % i + SEP)

    eol = b"\r\n" if crlf else b"\n"
    path.write_bytes(eol.join(out) + eol)

    print(f"wrote {len(out):,} entries to {path}")
    print(f"  {original_count:,} from the original, {len(out) - original_count:,} added as padding")
    print()
    print("Now start the client again.")
    print("  - the box shows [1837] or similar -> that is the error's index. Report it.")
    print("  - the box is STILL completely empty -> it is not a msgstringtable lookup,")
    print("    and the message comes from somewhere else in the binary.")
    print()
    print(f"Restore with: python {Path(__file__).name} \"{path}\" --restore")
    return 0


if __name__ == "__main__":
    sys.exit(main())
