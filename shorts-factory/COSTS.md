# COSTS — what this factory actually spends, measured

> Written 2026-08-21, after a bill arrived that was assumed to be TTS and was not.
> Every quantity below is **measured from this repo**, not estimated. Every unit price is
> from a public price list and is dated. Neither the bill nor the billing console is
> visible from the machine that produces these videos, so the totals are a *reconstruction*
> — the authoritative number is Google Cloud billing broken down by SKU.

## The finding

**One Gemini key pays for two very different things, and the cheap one got the blame.**
`tools/gen_voice_gemini.py` and `tools/gen_image.py` both read `GEMINI_API_KEY`. Voice is
~9% of the spend. Images are the rest.

| | measured quantity | unit price | cost |
|---|---|---|---|
| **TTS** — audio out | 4,656 s kept in the caches = **116,400 tokens** @ 25 tok/s | $20 / 1M | **$2.33** |
| **TTS** — text in | ~63,200 Thai characters over 562 calls | $1 / 1M | ~$0.10 |
| **Images** — `gemini-3.1-flash-image` @ 2K | **162** (73 plates · 49 props · 40 older) | $0.101 ea | **$16.36** |
| **Images** — `gemini-3-pro-image` @ 2K | **64** (14 covers · 50 older) | $0.134 ea | **$8.58** |
| | | **provable total** | **≈ $27.4** |

**What is NOT in that table, and is the other half of the bill: generations that were
discarded before they were committed.** A rejected cover, a plate that read wrong, a prompt
that had to be hardened — each cost full price and left no trace on disk or in git. Git
confirms this directly: 226 sidecars ever added, **zero ever deleted**. The tools only keep
what worked, so the archive systematically under-counts spend by exactly the failure rate.

A ~2,000 THB bill is ~$55 net of Thailand's 7% VAT. Against $27.4 provable, that implies
**roughly one discarded image for every one kept** — which matches how the work actually went.

## What to change, largest lever first

1. **Use the Batch API for images. Flat 50% off, and it costs nothing here.** Every image in
   this pipeline is generated *ahead of* the render, never interactively — the one property
   batch mode requires. This alone is worth more than every other item below combined.

2. **`--size` defaults to 2K, and props do not need it.** A cut-out prop is placed at
   240–280 px wide in a 1920 comp, so it lands at ~560 px in the 4K master — **1K is already
   1.8× oversampled**. 1K is $0.067 against 2K's $0.101, a third off, for pixels nobody sees.
   *Full-frame plates must stay at 2K*: they fill 3840 px.

3. **Probe at 1K before committing at 2K.** The expensive failures are compositional — a
   border where a full bleed was wanted, a subject that reads as something else. All of those
   are visible at 1K. Probe cheap, then generate the keeper once.

4. **`--model pro` is for covers.** 50 non-cover images were generated on pro. Pro is only
   33% dearer than flash, so this is the smallest lever — but it is free to apply.

## Prices used, and when they were read

Read 2026-08-21. Preview models reprice without notice; re-check before trusting these.

| model | price |
|---|---|
| `gemini-3.1-flash-tts-preview` | $1 / 1M text in · **$20 / 1M audio out** · 25 audio tokens per second |
| `gemini-3.1-flash-image` | $0.045 (512px) · $0.067 (1K) · **$0.101 (2K)** · $0.151 (4K) |
| `gemini-3-pro-image` | **$0.134 (1K and 2K)** · $0.24 (4K) |
| Batch API, both | flat **−50%** |

## How to re-measure

```bash
# TTS: every wav in every voice cache is one paid call
python3 - <<'PY'
import glob, wave, contextlib
s=sum(wave.open(w).getnframes()/wave.open(w).getframerate()
      for w in glob.glob('vox-shorts/*/voice/line-*.wav'))
print(f"{s:.0f}s audio -> {s*25:,.0f} output tokens")
PY

# images: one sidecar json per kept generation, and it records the model
grep -h '"model"' media/projects/**/*.json | sort | uniq -c
```
