# Setup — what this needs before it can render anything

Written after copying the project in (2026-08-02). Upstream's README has a Quickstart; this
file is the part that is specific to *us*: what is already here, what is missing, and what
each API key actually buys.

Everything below runs from `shorts-factory/`, not from the repo root.

## 1. Toolchain

Checked in the Claude Code container on 2026-08-02:

| | required | this container | note |
|---|---|---|---|
| Node | 18+ | **22.22.2** ✅ | |
| npm | — | **10.9.7** ✅ | |
| Python | 3.10+ | **3.11.15** ✅ | |
| `ffmpeg` on PATH | yes | **installed 2026-08-02** ✅ | `apt-get update && apt-get install -y ffmpeg` |
| `ffprobe` on PATH | yes | **installed** ✅ | same package |

The `ffmpeg-linux` under `/opt/pw-browsers/ffmpeg-1011/` is Playwright's stripped build and
ships no `ffprobe` — do not point the tools at it. Install the real package. (`apt-get
install` fails with 404s until `apt-get update` runs; the image's index is stale.)

```bash
cd shorts-factory/remotion && npm install && npm run gen
```

### The renderer needs a browser, and it cannot download one

Remotion fetches its own Chrome Headless Shell on first render, from `remotion.media` — a
host this environment's egress policy does not allow. The container already ships a suitable
build, so point the render scripts at it:

```bash
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

It must be the **headless shell**, not `chromium-1194/chrome-linux/chrome` — Remotion drives
the old headless protocol, and full Chrome removed it ("Old Headless mode has been removed
from the Chrome binary").

Fonts are inlined into the bundle (`remotion/src/fonts.gen.ts`, see UPSTREAM.md), so
nothing else in a render touches the network either.

`npm run gen` regenerates `src/registry.gen.tsx` from `src/shots/`. It must be re-run after
adding or renaming a shot — `frames.mjs` and `render-all.mjs` do **not** run it themselves.

## 2. Python packages

The core pipeline is **stdlib only** — `gen_voice.py`, `gen_sfx.py`, `gen_music.py`,
`gen_clip.py`, `mix_sfx.py`, `mix_music.py`, `gen_chords.py` and `bakeoff_clip.py` all talk
HTTP through `urllib`. Nothing to install for the TSX track.

Three tools are the exception, and each belongs to a track we may never use:

| tool | needs | used by |
|---|---|---|
| `gen_image.py` | `pip install google-genai` | AI-image story frames, vox layers |
| `cutout.py` | `pip install pillow rembg` | vox collage cutouts |
| `capture_web.py` | `pip install playwright && playwright install chromium` | HTML→PNG layers |

## 3. API keys — `shorts-factory/.env`

```bash
cp shorts-factory/.env.example shorts-factory/.env
```

The root `.gitignore` ignores `.env` at any depth, so this file will not be committed. Keep
these out of the RO server's `.env`; they are unrelated systems.

| key | what breaks without it | needed for |
|---|---|---|
| `ELEVENLABS_API_KEY` | no voice, no generated SFX, no music beds | **all three tracks** |
| `GEMINI_API_KEY` | no AI-generated stills | story-frame shorts, vox layers |
| `FAL_KEY` | no video-model clips | the generative track only |

**A TSX short needs exactly one key: `ELEVENLABS_API_KEY`.** That is the cheapest way in,
and it is the track to start on.

### Or run the voice yourself — `tools/gen_voice_local.py`

Added 2026-08-02. Same `beats.json` contract as `gen_voice.py`, but it POSTs to a TTS server
you host (RunPod, vLLM, anything) instead of ElevenLabs. No key, no per-character bill.

```bash
export LOCAL_TTS_URL=https://<pod-id>-8000.proxy.runpod.net/v1/audio/speech
export LOCAL_TTS_MODEL=<model-id>   LOCAL_TTS_VOICE=<voice-id>
python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json --dry-run
python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json
```

It defaults to the OpenAI `/v1/audio/speech` body shape, which most self-host wrappers
already expose; `LOCAL_TTS_BODY` takes a JSON template for anything else. Verified end to
end against a stand-in server: generates per line, measures the real durations, **reports
which lines overflow their authored window**, mixes one timeline, and writes the measured
timings back into `beats.json`. `--retime` rewrites the windows from the audio instead of
keeping the estimates — use that when the VO is a different language or length from the
plan, and move the composition's `CUE` table with it.

**What it cannot do: per-word timestamps.** The `short-N` TSX track highlights the exact
spoken word, and that needs them; ElevenLabs returns them from `/with-timestamps` and a raw
TTS server does not. Recover them with forced alignment (whisperx / ctc-forced-aligner / MFA)
over the audio this writes. **The vox track needs none of this** — its on-screen text carries
the words, so a self-hosted voice is a straight drop-in there.

### If the narration goes Thai, the on-screen text has a blocker

Measured in this container on 2026-08-02, and it is not obvious until a render comes back
full of empty boxes:

- **None of the five bundled brand fonts covers Thai.** Space Grotesk, Inter, JetBrains Mono,
  Spectral and Source Serif 4 are all latin-subset here, and even their full versions have no
  Thai glyphs.
- The headless Chromium has **59 fonts total**, and the only ones with Thai coverage are
  `Loma`, `FreeSerif` and `Unifont` — a fallback stack, not a brand.

The fix is small but it is real work: add a Thai family (Noto Serif Thai / Sarabun / IBM Plex
Sans Thai — all OFL) to `WANTED` in `remotion/scripts/fetch-fonts.mjs`, re-run it, and give
`FONT_EDITORIAL`/`FONT_BODY` a Thai fallback. Do it when the language is decided, not before.

Thai also has **no spaces between words**, so per-word captions need a segmenter
(`pythainlp` newmm) before an aligner can label anything. Another reason the vox track is the
easier one to take Thai.

### What the money looks like

- **ElevenLabs** — subscription, priced per character of TTS. A short is ~100 words, so the
  voice for one video is negligible; the free tier is enough to prove the pipeline works.
  `gen_voice.py` caches each line by text-hash, so rewriting one line re-bills one line.
  It uses the `/with-timestamps` endpoint (model `eleven_multilingual_v2`) — the per-word
  timings are what makes the captions land on the exact spoken word, and there is no way to
  fake them.
- **fal.ai** — pay per generation, and the only place a video can get genuinely expensive.
  Upstream derived the numbers rather than quoting them; `ai-shorts/IDEAS.md` §"Models &
  cost" has the table. Headline: a 40s vertical short at 1080p through Seedance 1.5 Pro is
  **~$2.33 per full pass**, with `generate_audio:false` (audio on doubles the token rate,
  and we supply our own sound anyway).
- **Gemini** — image generation, cheap per still.

Upstream's own note is worth keeping: an earlier draft of that cost table was wrong by ~5×
because it compared one model's with-audio price against another's audio-off price. Derive
the cost from the token formula before spending, don't trust a docs page.

## 4. First run, in order

```bash
# once
sudo apt-get install -y ffmpeg
cd shorts-factory/remotion && npm install && npm run gen && cd ..
cp .env.example .env        # fill in ELEVENLABS_API_KEY

# prove the renderer works, without spending anything:
cd remotion && node scripts/frames.mjs Short2Math 0,300,600 --scale=0.5
```

That renders three PNGs from the committed ×11-trick example. If they look right, the whole
TSX track is working and only the voice step is unproven.

Then, in Claude Code opened on this folder: **"make a short about <topic>"**.
