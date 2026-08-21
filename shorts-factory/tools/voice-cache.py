#!/usr/bin/env python3
"""Persist the paid TTS line cache across containers.

WHY THIS EXISTS. `vox-shorts/*/voice/` was gitignored as "regenerable". The May–Aug invoice
shows `gemini-3.1-flash-tts` billed 15,245 s of audio against 4,656 s sitting in the caches:
**the same lines bought 3.3 times over**, because this repo is cloned into a fresh container
and every session re-paid for audio it already owned. Regenerable, yes — with money.

So the cache is committed, as FLAC (lossless, ~55% of WAV), and restored to WAV on demand.
`voice.wav` — the per-video concatenated mix — is NOT stored: it is free to rebuild from the
lines, and it is two thirds of the bytes.

    python tools/voice-cache.py pack      # wav -> flac in vox-shorts/*/voice-cache/, then commit
    python tools/voice-cache.py restore   # flac -> wav, before generating anything
    python tools/voice-cache.py status    # what is where, and what a fresh run would re-buy

Run `restore` at the START of any session that will touch voice, and `pack` after generating.
`gen_voice_gemini.py` keys its cache on a hash of (text, voice, style, model), so a restored
WAV is a cache hit and costs nothing.
"""
import glob
import os
import subprocess
import sys
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = 25  # TTS audio output tokens per second, for the "what would this cost" line
PRICE_PER_TOKEN_THB = 0.00066  # gemini-3.1-flash-tts, derived from the invoice


def ff(*a):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *a], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"ffmpeg failed: {r.stderr.strip()[:300]}")


def projects():
    for d in sorted(glob.glob(os.path.join(ROOT, "vox-shorts", "*"))):
        if os.path.isdir(d):
            yield d


def seconds(paths):
    t = 0.0
    for p in paths:
        try:
            with wave.open(p) as f:
                t += f.getnframes() / f.getframerate()
        except Exception:
            pass
    return t


def pack():
    n = wav_b = flac_b = 0
    for d in projects():
        src, dst = os.path.join(d, "voice"), os.path.join(d, "voice-cache")
        lines = sorted(glob.glob(os.path.join(src, "line-*.wav")))
        if not lines:
            continue
        os.makedirs(dst, exist_ok=True)
        for w in lines:
            out = os.path.join(dst, os.path.basename(w)[:-4] + ".flac")
            if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(w):
                flac_b += os.path.getsize(out)
                wav_b += os.path.getsize(w)
                continue
            ff("-i", w, "-c:a", "flac", "-compression_level", "8", out)
            n += 1
            wav_b += os.path.getsize(w)
            flac_b += os.path.getsize(out)
        print(f"  {os.path.basename(d):<26} {len(lines):>3} lines")
    if not wav_b:
        return print("nothing to pack — no line-*.wav found. Did you mean `restore`?")
    print(f"\npacked {n} new · {wav_b/1e6:.0f} MB wav -> {flac_b/1e6:.0f} MB flac "
          f"({flac_b/wav_b*100:.0f}%)\nnow `git add vox-shorts/*/voice-cache` and commit.")


def restore():
    n = 0
    for d in projects():
        src, dst = os.path.join(d, "voice-cache"), os.path.join(d, "voice")
        fl = sorted(glob.glob(os.path.join(src, "line-*.flac")))
        if not fl:
            continue
        os.makedirs(dst, exist_ok=True)
        for f in fl:
            out = os.path.join(dst, os.path.basename(f)[:-5] + ".wav")
            if os.path.exists(out):
                continue
            ff("-i", f, "-c:a", "pcm_s16le", out)
            n += 1
        print(f"  {os.path.basename(d):<26} {len(fl):>3} lines")
    print(f"\nrestored {n} wav. Generating now will hit the cache instead of the API."
          if n else "\nnothing restored — every line was already present as wav.")


def status():
    tw = tf = 0.0
    print(f"{'project':<28}{'wav':>6}{'flac':>7}")
    for d in projects():
        w = glob.glob(os.path.join(d, "voice", "line-*.wav"))
        f = glob.glob(os.path.join(d, "voice-cache", "line-*.flac"))
        if not (w or f):
            continue
        print(f"  {os.path.basename(d):<26}{len(w):>6}{len(f):>7}")
        tw += seconds(w)
        tf += len(f)
    print(f"\n{tw:,.0f}s of wav on disk. At {RATE} tokens/s and ฿{PRICE_PER_TOKEN_THB}/token,")
    print(f"re-generating it from scratch would cost ฿{tw*RATE*PRICE_PER_TOKEN_THB:,.0f}.")
    if not tf:
        print("\n⚠ NOTHING IS PACKED. This cache dies with the container — run `pack`.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"pack": pack, "restore": restore, "status": status}.get(cmd, lambda: sys.exit(__doc__))()
