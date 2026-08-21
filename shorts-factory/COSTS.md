# COSTS — what this factory actually spends

> **Rewritten 2026-08-21 against the real SKU report** (`My Billing Account, 2026-05-01 →
> 2026-08-31`, ฿1,317.64). An earlier version of this file guessed from the repo alone and was
> wrong three ways; §4 lists them, because the wrong version was believed for a day.

## 1. The split, from the bill

| | ฿ | share | what it is |
|---|---|---|---|
| **Images** | **752.11** | **57.1%** | 262 generations · `gemini-3.1-flash-image` + `gemini-3-pro-image` |
| **Voice** | **455.85** | **34.6%** | 10.9 hours of audio billed · TTS |
| Text (LLM) | 109.67 | 8.3% | `2.5-flash-lite`, `3-flash`, `3-pro` — **no tool in this repo calls a text model** |
| | **1,317.63** | | |

## 2. Unit prices, derived from the bill rather than from a price list

Both image models bill **1,120 output tokens per image**, and 77,280 ÷ 1,120 = 69.0 and
216,160 ÷ 1,120 = 193.0 — two exact integers, which is what makes this trustworthy.

| | ฿ / image | $ |
|---|---|---|
| `gemini-3.1-flash-image` @ 2K (2752×1536) | **฿2.25** | $0.067 |
| `gemini-3-pro-image` @ 2K | **฿4.51** | $0.133 |
| TTS audio out | ฿0.00066 / token · **25 tokens per second** | |

**1K and 2K are the same 1,120-token tier.** Lowering `--size` to 1K saves nothing. The
published table that says otherwise is wrong; the invoice is not.

## 3. Where the money actually goes

**Images are efficient. 262 generated, 226 kept — a 14% discard rate.** There is no discipline
problem here; the cost is unit price × volume, so only unit price or provider can move it.

**Voice is where the waste is, and it is structural.** `gemini-3.1-flash-tts` billed **15,245 s
of audio; the caches hold 4,656 s. That is 3.3× re-billed** — and the cause is one line in
`.gitignore`:

```
vox-shorts/*/voice/          # "regenerable"
```

The cache is 24 kHz mono WAV, ~223 MB of lines, and it is **gitignored, so it dies with the
container**. Every fresh session re-buys audio that was already paid for. It was called
regenerable when regenerating was assumed to be free. It is ฿254 so far.

**฿307 (23%) cannot be attributed to this repo at all.** `Gemini 2.0 Flash TTS` is ฿195.75 —
6.7 hours of audio on a model that `DEFAULT_MODEL` has never been set to in any commit — and
the text-LLM SKUs are ฿109.67 against a codebase with no text-model call in it. **Check whether
another application shares this key before optimising anything here**, because a quarter of the
bill is not ours to cut.

## 4. What the previous version of this file got wrong

Kept on purpose. All three errors came from reasoning about the bill instead of reading it.

1. **"TTS is ~9% of spend."** It is **34.6%**. The repo's caches were treated as a record of
   what was bought; they are a record of what survived the last container.
2. **"Roughly one discarded image per kept one."** Images discard at **14%**. The 3.3×
   over-generation is voice, and it is not discarding at all — it is re-buying.
3. **"Props at `--size 1K` save a third."** 1K and 2K bill identically. Saves nothing.

The common failure: **an archive that only keeps successes cannot measure spend, and a cache
that is deleted cannot measure anything.** Bill first, repo second.

## 5. What to change

### Free and immediate — do these

| | saves | how |
|---|---|---|
| **Persist the voice cache off-container** | **~฿177** | it is 223 MB of WAV (~120 MB FLAC). Sync `vox-shorts/*/voice/` to R2/B2 before generating and after. Not a repo commit — it grows without bound |
| **Batch API for images** | **~฿376** | flat −50%. Every image here is generated *ahead of* the render, which is the only property batch mode requires |
| **`--model pro` for covers only** | **~฿124** | 69 pro generations, only 14 are covers. Pro is 2× flash for pixels that get dimmed to 0.84 and put behind text |

**฿1,010 attributable → ~฿333. A 67% cut with no change in output.**

### The bigger move — a different provider for the pixels that carry no text

**212 of 226 kept images contain no text at all** — plates dimmed to 0.84 behind type, and
cut-out props that go through `rembg` anyway. FLUX.1 [schnell] is ~$0.003 against Gemini flash's
$0.067: **22× cheaper**, and the quality bar for a dimmed backdrop is low.

**The 14 covers must stay on Gemini.** They carry Thai headlines, and Thai script is exactly
what the open image models cannot render — every cover in this repo would come back as
scribble. That is the whole reason the covers are worth ฿4.51 each and the plates are not.

Bake it off before switching (`tools/bakeoff_clip.py` is the precedent): same five plate prompts
on both, dimmed to 0.84, judged at phone scale. If it passes, images drop from ฿752 to under
฿100 and the total lands near **฿165 — an 84% cut**.

## 6. Re-measuring

Download the SKU report — Billing → Reports → **Group by `SKU`** (not `Service`; `Service`
lumps images and voice into one `Gemini API` line, which is what hid this) → **Download CSV**.

```bash
# billed audio seconds vs what the caches actually hold
python3 - <<'PY'
import glob, wave
s=sum(wave.open(w).getnframes()/wave.open(w).getframerate()
      for w in glob.glob('vox-shorts/*/voice/line-*.wav'))
print(f"cached {s:,.0f}s — compare against (audio output tokens ÷ 25) on the bill")
PY

# images generated, from the bill: output tokens ÷ 1120
```
