#!/usr/bin/env python3
"""Self-test for gen_srt.py — runs without audio, so CI can run it.

The generator's own `--check` needs the wav files, and those are gitignored (regenerable,
and 1.2 GB). So the thing CI can guard is the layout and timing logic, plus the committed
.srt files themselves. Both are enough to catch the bugs this tool actually had:

  * merging a too-short cue into a neighbour without re-checking the caps, which produced
    83-character display lines and 7.1s cues
  * grouping against a flat character budget while wrapping broke at phrase boundaries, so
    cues were handed to wrap() that it could not lay out and came back as one long line

Run: ./tools/test-gen-srt.py
"""

import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_srt import (MAX_CUE_SEC, MAX_LINE, MAX_LINES, MIN_CUE_SEC, SNAP_SEC, _read_number,
                     cue_line,
                     fits_box,
                     spoken, split_wide, weight, width, wrap)

fails = []


def check(cond, msg):
    if not cond:
        fails.append(msg)


# ---- 1. numbers are read the way the narrator read them -----------------------------
# Every expected value here was copied from a `say` field a human wrote by hand for the
# TTS, so this is ground truth, not the author's opinion of Thai.
for src, want in [
    ("0", "ศูนย์"), ("1", "หนึ่ง"), ("10", "สิบ"), ("11", "สิบเอ็ด"), ("20", "ยี่สิบ"),
    ("21", "ยี่สิบเอ็ด"), ("68", "หกสิบแปด"), ("80", "แปดสิบ"), ("100", "หนึ่งร้อย"),
    ("105", "หนึ่งร้อยห้า"), ("150", "หนึ่งร้อยห้าสิบ"), ("199", "หนึ่งร้อยเก้าสิบเก้า"),
    ("360", "สามร้อยหกสิบ"), ("2000", "สองพัน"), ("1945", "หนึ่งพันเก้าร้อยสี่สิบห้า"),
    ("1959", "หนึ่งพันเก้าร้อยห้าสิบเก้า"), ("5604", "ห้าพันหกร้อยสี่"),
    ("4.2", "สี่จุดสอง"), ("0.5", "ศูนย์จุดห้า"),
]:
    got = _read_number(src)
    check(got == want, f"read {src}: got {got!r}, want {want!r}")

check(spoken("แบต 60.48 กิโลวัตต์") == "แบต หกสิบจุดสี่แปด กิโลวัตต์", "spoken() in context")
check(spoken("1,200 ไร่") == "หนึ่งพันสองร้อย ไร่", "spoken() strips thousands separators")

# ---- 2. width ignores combining marks, weight does not -------------------------------
# ำ (U+0E33) and า (U+0E32) take a column; ั ี ่ ้ do not. Getting that boundary wrong is
# the same defect as the drifting chips and the over-long titles in PIPELINE.md §10.
for s_, want_ in [("ที่", 1), ("กำลัง", 4), ("แบตเตอรี่", 7), ("ไฟฟ้า", 4), ("น้ำ", 2)]:
    check(width(s_) == want_, f"width({s_!r}) = {width(s_)}, want {want_}")
check(weight("WLTP") > weight("ABCD".lower()) * 0 + 4, "latin costs more than one char each")
check(weight("360") > weight("abc"), "a number weighs what its spelling weighs")

# ---- 3. a phrase is never cut inside a cluster ---------------------------------------
long_run = "การชาร์จคือการพาไอออนลิเทียมเข้าไปแทรกตัวอยู่ระหว่างชั้นเหล่านั้น"
parts = split_wide(long_run)
check("".join(parts) == long_run, "split_wide lost or added characters")
check(len(parts) > 1, "split_wide did not split a 51-char phrase")
for p in parts[1:]:
    check(bool(re.match(r"[เ-ไ]", p)), f"split landed somewhere other than a leading vowel: {p[:12]!r}")
# No usable break: return it whole rather than guess.
check(split_wide("ก" * 60) == ["ก" * 60], "split_wide invented a break with no leading vowel")

# ---- 4. every real line in the repo lays out inside the caps ------------------------
# The first version of this test drove synthetic input — twelve copies of one 36-character
# phrase — and passed against all three bugs listed at the top of this file, because uniform
# input never exercises the paths that broke. beats.json IS committed (only the wav files are
# not), so the test drives the real 223 lines instead. Verified by mutation: reverting any of
# the three fixes fails this section.
HERE = os.path.dirname(os.path.abspath(__file__))
beats_files = sorted(glob.glob(os.path.join(HERE, "..", "vox-shorts", "*", "beats.json")))
check(len(beats_files) >= 9, f"expected at least 9 beats.json, found {len(beats_files)}")

lines_seen = cues_seen = 0
for bf in beats_files:
    name = os.path.basename(os.path.dirname(bf))
    data = json.load(open(bf, encoding="utf-8"))
    for i, vo in enumerate(data.get("vo", [])):
        if "start" not in vo or "end" not in vo:
            continue
        lines_seen += 1
        span = vo.get("seconds", vo["end"] - vo["start"])
        cues = cue_line(vo)
        cues_seen += len(cues)
        check(bool(cues), f"{name} line {i}: produced no cues")
        check(abs(cues[0][0] - vo["start"]) < 1e-6, f"{name} line {i}: first cue misses the line start")
        check(abs(cues[-1][1] - (vo["start"] + span)) < 1e-6, f"{name} line {i}: last cue misses the line end")
        for k, (a_, b_, lines) in enumerate(cues):
            check(b_ > a_, f"{name} line {i} cue {k}: not forward")
            check(b_ - a_ <= MAX_CUE_SEC + 1e-6, f"{name} line {i} cue {k}: runs {b_ - a_:.2f}s")
            check(len(lines) <= MAX_LINES, f"{name} line {i} cue {k}: {len(lines)} display lines")
            check(max(width(l) for l in lines) <= MAX_LINE or len(lines) == 1,
                  f"{name} line {i} cue {k}: a line is {max(width(l) for l in lines)} wide "
                  f"with {len(lines)} lines")
            if k:
                check(abs(a_ - cues[k - 1][1]) < 1e-6, f"{name} line {i} cue {k}: leaves a hole")
        # Every phrase the writer put in must survive into some cue, once, in order.
        check("".join("".join(l.split()) for _, _, ls in cues for l in ls)
              == "".join(vo["text"].split()),
              f"{name} line {i}: cues do not reconstruct the line's text")

# ---- 5. snapping moves a boundary onto a pause, but never starves a cue ---------------
def synth(text, start=10.0, seconds=20.0, pauses=()):
    return cue_line({"text": text, "start": start, "end": start + seconds, "seconds": seconds},
                    pauses)


body = " ".join(["ประโยคทดสอบยาว", "สั้น", "วรรคที่ยาวกว่าเดิมพอสมควรจริงๆ", "อีกวรรคหนึ่ง"] * 4)
plain = synth(body)
check(len(plain) >= 3, f"the snap fixture only made {len(plain)} cues")
edge = plain[0][1] - 10.0                       # first internal boundary, line-relative

near = synth(body, pauses=[edge + 0.4])
check(abs(near[0][1] - (10.0 + edge + 0.4)) < 1e-6, "a pause 0.4s away did not attract the boundary")

far = synth(body, pauses=[edge + SNAP_SEC + 0.5])
check(abs(far[0][1] - plain[0][1]) < 1e-6, "a pause beyond SNAP_SEC moved the boundary anyway")

# A pause inside SNAP_SEC but so early it would leave the first cue unreadable must be
# refused. Reachable only when the first boundary sits in [MIN_CUE_SEC*0.6 + ..., SNAP_SEC +
# MIN_CUE_SEC*0.6), so the fixture is searched for rather than assumed — if the constants
# move, this reports that instead of silently testing nothing.
starved = None
for secs_ in [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0]:
    ref = synth(body, seconds=secs_)
    if len(ref) < 2:
        continue
    e_ = ref[0][1] - 10.0
    pause_ = e_ - SNAP_SEC + 0.01
    if 0 < pause_ < MIN_CUE_SEC * 0.6:
        starved = (secs_, ref, pause_)
        break
if starved is None:
    check(False, "no fixture reaches a starving pause — rewrite this, do not delete it")
else:
    secs_, ref, pause_ = starved
    got = synth(body, seconds=secs_, pauses=[pause_])
    check(abs(got[0][1] - ref[0][1]) < 1e-6,
          f"a snap to {pause_:.2f}s was allowed to starve the first cue "
          f"(boundary moved to {got[0][1] - 10.0:.2f}s)")

# ---- 6. grouping and wrapping agree about what fits ----------------------------------
for _, _, lines in plain:
    check(fits_box(" ".join(lines).split(" ")), "a cue the grouper accepted does not fit the box")

# ---- 7. the committed caption files are well-formed -----------------------------------
def secs(t):
    h, m, rest = t.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


srts = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "..", "vox-shorts", "*", "captions.th.srt")))
check(len(srts) >= 9, f"expected at least 9 committed caption files, found {len(srts)}")
for f in srts:
    name = os.path.basename(os.path.dirname(f))
    blocks = open(f, encoding="utf-8").read().strip().split("\n\n")
    prev = -1.0
    for n, blk in enumerate(blocks, 1):
        rows = blk.split("\n")
        check(rows[0] == str(n), f"{name}: cue index {rows[0]} out of sequence at {n}")
        a, b = (secs(x) for x in rows[1].split(" --> "))
        check(b > a, f"{name} cue {n}: not forward")
        check(a >= prev - 1e-6, f"{name} cue {n}: overlaps the previous cue")
        check(any(r.strip() for r in rows[2:]), f"{name} cue {n}: no text")
        check(len(rows[2:]) <= MAX_LINES, f"{name} cue {n}: {len(rows[2:])} display lines")
        prev = b

print(f"gen_srt: {lines_seen} script lines -> {cues_seen} cues, "
      f"{len(srts)} caption files checked")
if fails:
    print(f"\n✗ {len(fails)} failure(s):")
    for f in fails:
        print("  -", f)
    sys.exit(1)
print("all checks passed")
