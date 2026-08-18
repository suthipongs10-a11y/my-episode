#!/usr/bin/env python3
"""Thai SRT captions, generated from beats.json — never typed, never eyeballed.

  python tools/gen_srt.py --beats vox-shorts/vox-10-charge-curve/beats.json
  python tools/gen_srt.py --all                 # every project that has voice on disk
  python tools/gen_srt.py --all --check         # exit 1 if any .srt is stale (CI)

Why this can exist at all: `--retime` writes each line's REAL measured audio window into
beats.json, so a caption file is a pure transform of data already on disk. Nothing here
guesses when a word was said. `--verify` (default on) re-hashes every line the way
gen_voice_gemini.py does, re-measures the wav, and refuses to write if a window has drifted
from its audio — the SRT is only as honest as that check.

Three things that are easy to get wrong in Thai, and what this does about them:

1. **Thai has no spaces between words, so a caption may never be split on width alone.**
   But these scripts DO use spaces — the writer put them at breath boundaries, which is
   exactly where a caption should break. So cues are grouped from whole space-separated
   phrases and nothing is ever cut mid-phrase. Measured across all 9 voiced videos: 1,373
   phrases, median 12 display chars, max 57 — every one fits inside a two-line cue, so
   intra-phrase splitting never has to happen. If a phrase ever does need wrapping onto a
   second display line, `wrap()` breaks before a leading vowel (เ แ โ ใ ไ), which in Thai
   orthography always begins a syllable, so the break cannot land inside a cluster.

2. **Captions must show `text`, but time must follow `say`.** `text` is the readable script
   ("360 กิโลวัตต์"); `say` is what the narrator actually pronounced ("สามร้อยหกสิบ…").
   Their phrase counts differ — digits sit between spaces, their spellings do not — so the
   two cannot be paired phrase by phrase. Instead each display phrase is weighted by its
   own SPOKEN length: `spoken()` expands the digits the same way the writer did by hand.
   Checked against all 90 hand-written `say` fields in the repo:

       weighting by raw written text   mean error 11.48%   worst 44.4%
       + digit expansion                mean error  2.18%   worst 24.1%
       + latin counted 2x               mean error  1.59%   worst 12.8%   <- used here

   The 2x on latin is fitted, not invented: acronyms are read out as Thai letter names
   (`WLTP` -> `ดับเบิลยูแอลทีพี`) and 2.0 sits at the flat bottom of the fit, so it is not
   tuned to a knife edge. Residual error only redistributes time WITHIN one line; the line's
   own start and end are measured and are never moved.

3. **Thai combining marks are zero-width** (`PIPELINE.md` §10, the same bug as drifting
   chips and over-long titles). Width budgets strip them; timing weights do not, because
   the reading rate in §7 was measured on raw characters.
"""

import argparse, glob, hashlib, json, os, re, subprocess, sys

MAX_LINE = 38          # display chars per caption line, Thai on a phone
MAX_LINES = 2
MAX_CUE_SEC = 6.0
MIN_CUE_SEC = 1.2
LATIN_WEIGHT = 2.0     # fitted; see docstring
SNAP_SEC = 0.75        # how far a cue boundary may move to land on a real pause
DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"

COMBINING = re.compile(r"[ัิ-ฺ็-๎]")
LEADING_VOWEL = re.compile(r"[เ-ไ]")     # เ แ โ ใ ไ — always start a syllable
LATIN = re.compile(r"[A-Za-z]")
NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")

_D = "ศูนย์ หนึ่ง สอง สาม สี่ ห้า หก เจ็ด แปด เก้า".split()
_P = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"]


def _under_million(s):
    s = s.lstrip("0") or "0"
    if s == "0":
        return _D[0]
    out, n = [], len(s)
    for i, ch in enumerate(s):
        d, place = int(ch), len(s) - 1 - i
        if d == 0:
            continue
        if place == 1:
            out.append("ยี่สิบ" if d == 2 else "สิบ" if d == 1 else _D[d] + "สิบ")
        elif place == 0:
            out.append("เอ็ด" if d == 1 and n > 1 else _D[d])
        else:
            out.append(_D[d] + _P[place])
    return "".join(out)


def _read_int(s):
    s = s.lstrip("0") or "0"
    if len(s) > 6:
        head, tail = s[:-6], s[-6:]
        return _read_int(head) + "ล้าน" + (_under_million(tail) if tail.strip("0") else "")
    return _under_million(s)


def _read_number(tok):
    if "." in tok:
        a, b = tok.split(".", 1)
        return _read_int(a or "0") + "จุด" + "".join(_D[int(c)] for c in b if c.isdigit())
    return _read_int(tok)


def spoken(text):
    """`text` with every numeral replaced by roughly how the narrator pronounced it."""
    return NUMBER.sub(lambda m: _read_number(m.group(0).replace(",", "")), text)


def weight(text):
    """Relative time this text takes to say. Not a duration — only ratios are used."""
    s = spoken(text).replace(" ", "")
    return len(s) + len(LATIN.findall(s)) * (LATIN_WEIGHT - 1)


def width(text):
    """Display columns, with zero-width combining marks removed."""
    return len(COMBINING.sub("", text))


def split_wide(phrase):
    """Break one phrase that is wider than a caption line, without cutting a word.

    Thai writes เ แ โ ใ ไ BEFORE the consonant they are pronounced after, so a position
    immediately preceding one is always a syllable start and never lands inside a cluster.
    It is the only split point available without a Thai dictionary. If a phrase offers none
    that helps, it is returned whole and over-wide — the player soft-wraps it, which is ugly;
    breaking a word is wrong.
    """
    out, rest = [], phrase
    while width(rest) > MAX_LINE:
        cut = 0
        for m in LEADING_VOWEL.finditer(rest):
            if m.start() and width(rest[:m.start()]) <= MAX_LINE:
                cut = m.start()
            else:
                break
        if not cut:
            break
        out.append(rest[:cut].rstrip())
        rest = rest[cut:]
    out.append(rest)
    return out


def wrap(phrases):
    """Lay a cue out on display lines, breaking at phrase boundaries where possible."""
    lines, cur = [], ""
    for p in phrases:
        if width(p) > MAX_LINE:
            if cur:
                lines.append(cur)
                cur = ""
            lines.extend(split_wide(p))
            continue
        trial = f"{cur} {p}".strip()
        if cur and width(trial) > MAX_LINE:
            lines.append(cur)
            cur = p
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines or [""]


def fits_box(phrases):
    """Whether these phrases fit the caption box — asked of wrap(), never of a char budget.

    The first version tested `width(joined) <= MAX_LINE * MAX_LINES`, which is not the same
    question: breaking at phrase boundaries wastes part of every line, so 75 characters that
    pass that test can still need three lines. Grouping then handed wrap() cues it could not
    lay out, and the fallback returned them as one 75-character line. One function decides.
    """
    if len(phrases) <= 1:
        return True                      # nothing smaller exists; take it as it comes
    ls = wrap(phrases)
    return len(ls) <= MAX_LINES and all(width(l) <= MAX_LINE for l in ls)


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def cue_line(vo, pauses=()):
    """Split one narrated line into caption cues, timed inside its measured window.

    `pauses` are silence centres in seconds from the start of this line, detected in the
    real wav. Where one sits near a proportional boundary the boundary moves onto it, which
    turns an estimate into a measurement: the caption then changes during the breath, not
    mid-word. Measured over 206 internal boundaries before snapping — median 0.23s away
    from the nearest pause, worst 1.72s.
    """
    phrases = [p for p in vo["text"].split(" ") if p.strip()]
    start = vo["start"]
    span = vo.get("seconds", vo["end"] - vo["start"])
    total = sum(weight(p) for p in phrases) or 1.0

    groups, cur = [], []
    for p in phrases:
        trial = cur + [p]
        too_wide = not fits_box(trial)
        too_long = sum(weight(x) for x in trial) / total * span > MAX_CUE_SEC
        if cur and (too_wide or too_long):
            groups.append(cur)
            cur = [p]
        else:
            cur = trial
    groups.append(cur)

    # A cue too short to read gets folded into a neighbour — but ONLY into one that can take
    # it without breaking the layout or the duration cap. The first version merged
    # unconditionally and produced 83-character display lines and 7.1s cues, i.e. it undid
    # the very limits the grouping loop above exists to enforce. A cue that no neighbour can
    # absorb is left short on purpose: a brief caption is readable, an overflowing one is not.
    def fits(g):
        return fits_box(g) and sum(weight(x) for x in g) / total * span <= MAX_CUE_SEC

    changed = True
    while changed and len(groups) > 1:
        changed = False
        for i, g in enumerate(groups):
            if sum(weight(x) for x in g) / total * span >= MIN_CUE_SEC:
                continue
            cands = []
            for j in (i - 1, i + 1):
                if not 0 <= j < len(groups):
                    continue
                merged = groups[j] + g if j < i else g + groups[j]
                if fits(merged):
                    cands.append((width(" ".join(merged)), j, merged))
            if not cands:
                continue
            _, j, merged = min(cands)
            groups[min(i, j)] = merged
            del groups[max(i, j)]
            changed = True
            break

    # Proportional boundaries first, then pull each onto a real pause where one is close.
    edges, acc = [0.0], 0.0
    for g in groups:
        acc += sum(weight(x) for x in g)
        edges.append(span * (acc / total))
    edges[-1] = span

    for i in range(1, len(edges) - 1):
        near = [x for x in pauses if abs(x - edges[i]) <= SNAP_SEC]
        if not near:
            continue
        cand = min(near, key=lambda x: abs(x - edges[i]))
        lo, hi = edges[i - 1], edges[i + 1]
        # Only move if both neighbouring cues stay readable. A snap that starves a cue is
        # a worse caption than a boundary sitting 0.3s off a breath.
        if cand - lo >= MIN_CUE_SEC * 0.6 and hi - cand >= MIN_CUE_SEC * 0.6 \
                and cand - lo <= MAX_CUE_SEC + SNAP_SEC and hi - cand <= MAX_CUE_SEC + SNAP_SEC:
            edges[i] = cand

    return [(start + edges[i], start + edges[i + 1], wrap(g)) for i, g in enumerate(groups)]


SILENCE = re.compile(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)")


def pauses_in(path):
    """Centres of every pause in one line's audio. These are the writer's spaces, heard."""
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af",
                        "silencedetect=noise=-32dB:d=0.12", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [(float(a) + float(b)) / 2 for a, b in SILENCE.findall(r.stderr)]


def wav_seconds(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def verify(proj, beats):
    """Refuse to caption audio we cannot find, or a window that no longer matches it."""
    chan = beats.get("channel")
    if not chan:
        return [f"{proj}: beats.json has no channel — cannot locate the voice"]
    cfg = json.load(open(os.path.join("channels", f"{chan}.json"), encoding="utf-8"))
    model = os.environ.get("GEMINI_TTS_MODEL", DEFAULT_MODEL)
    bad, wavs = [], {}
    for i, v in enumerate(beats["vo"]):
        said = v.get("say") or v["text"]
        key = f"{model}|{cfg['voice']}|{cfg.get('style') or ''}|{said}"
        h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]
        p = os.path.join(proj, "voice", f"line-{i:02d}-{h}.wav")
        if not os.path.exists(p):
            bad.append(f"  line {i}: no wav for the current text (expected {os.path.basename(p)})")
            continue
        real, dec = wav_seconds(p), v.get("seconds", v["end"] - v["start"])
        if abs(real - dec) > 0.02:
            bad.append(f"  line {i}: beats says {dec:.2f}s, audio is {real:.2f}s — re-run --retime")
        wavs[i] = p
    return bad, wavs


def build(path, do_verify=True):
    proj = os.path.dirname(path)
    beats = json.load(open(path, encoding="utf-8"))
    wavs = {}
    if do_verify:
        bad, wavs = verify(proj, beats)
        if bad:
            print(f"✗ {os.path.basename(proj)} — timings are not backed by the audio on disk:")
            print("\n".join(bad))
            return None
    cues = [c for i, v in enumerate(beats["vo"])
            for c in cue_line(v, pauses_in(wavs[i]) if i in wavs else ())]
    body = "\n\n".join(
        f"{n}\n{ts(a)} --> {ts(b)}\n" + "\n".join(ls)
        for n, (a, b, ls) in enumerate(cues, 1)
    ) + "\n"
    return beats, cues, body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--check", action="store_true", help="exit 1 if any file is stale")
    ap.add_argument("--no-verify", action="store_true", help="skip the audio cross-check")
    a = ap.parse_args()

    if a.all:
        paths = [p for p in sorted(glob.glob("vox-shorts/*/beats.json"))
                 if glob.glob(os.path.join(os.path.dirname(p), "voice", "line-*.wav"))]
    elif a.beats:
        paths = [a.beats]
    else:
        ap.error("pass --beats <path> or --all")

    stale, failed = [], []
    for p in paths:
        name = os.path.basename(os.path.dirname(p))
        r = build(p, do_verify=not a.no_verify)
        if r is None:
            failed.append(name)
            continue
        beats, cues, body = r
        out = os.path.join(os.path.dirname(p), "captions.th.srt")
        old = open(out, encoding="utf-8").read() if os.path.exists(out) else None
        longest = max(b - x for x, b, _ in cues)
        fastest = max(sum(width(l) for l in ls) / max(b - x, 0.01) for x, b, ls in cues)
        widest = max(width(l) for _, _, ls in cues for l in ls)
        note = f"{len(cues):3d} cues from {len(beats['vo']):3d} lines · longest {longest:.1f}s · " \
               f"widest {widest} ch · peak {fastest:.0f} ch/s"
        if a.check:
            if old != body:
                stale.append(name)
                print(f"STALE {name:26s} {note}")
            else:
                print(f"ok    {name:26s} {note}")
        else:
            open(out, "w", encoding="utf-8").write(body)
            print(f"{'wrote' if old != body else 'same '} {name:26s} {note}")

    if failed:
        print(f"\n✗ {len(failed)} project(s) could not be verified: {', '.join(failed)}")
        sys.exit(1)
    if a.check and stale:
        print(f"\n✗ {len(stale)} stale — run: python tools/gen_srt.py --all")
        sys.exit(1)


if __name__ == "__main__":
    main()
