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
| `GOOGLE_TTS_API_KEY` | no voice | **all three tracks** — this is the voice path we use |
| `ELEVENLABS_API_KEY` | no generated SFX, no music beds; the original voice path | SFX + music |
| `GEMINI_API_KEY` | no AI-generated stills | story-frame shorts, vox layers |
| `FAL_KEY` | no video-model clips | the generative track only |

**A short needs exactly one key to get a voice: `GOOGLE_TTS_API_KEY`.** That is the cheapest
way in and the track to start on.

### The voice we actually use — `tools/gen_voice_gemini.py`

Chosen 2026-08-04, and chosen by elimination rather than by preference. Ten TTS providers
were probed from this environment; **generativelanguage.googleapis.com was the only one
reachable**. ElevenLabs, OpenAI, Cartesia, Deepgram, PlayHT, fal, Replicate and MiniMax all
fail at proxy CONNECT (HTTP 000), so `gen_voice.py` cannot run here at all.

It is also the right shape for this work regardless: usage-billed and always up, where a GPU
pod bills by the wall-clock hour whether it is speaking or idle.

```bash
export GOOGLE_TTS_API_KEY=...
# audition first — pick a voice from the real script, never from a spec sheet
python tools/gen_voice_gemini.py --audition "สองสิ่งนี้ เกิดขึ้นในอำเภอเดียวกัน" \
  --voices Algieba,Charon,Orus,Iapetus,Gacrux,Rasalgethi
python tools/gen_voice_gemini.py --beats vox-shorts/vox-2-thai-rice/beats.json \
  --voice Algieba --retime --mux remotion/out/Vox2ThaiRice.mp4
```

Four things about it that cost time to learn, all of them in the tool's docstring:

- **There is no `duration` parameter.** `--fit-window` has no equivalent here. Generate,
  measure, then move the picture — that is what `--retime` is for.
- **A style/pace instruction IS interpreted, not spoken.** Measured on a Thai line: −2.92s
  for "faster", +6.00s for "slower". So `--style` steers length coarsely. It does not hit a
  target to the frame, and re-rolling with stronger adjectives is not a plan.
- **Number normalisation is per-utterance and not reliable.** `ค.ศ. 1945` came out digit by
  digit in one line while `ค.ศ. 1959` was correct two lines later. A `vo` entry can carry a
  `say` override for what is spoken, leaving `text` readable. **Verify by transcribing the
  audio back** — Gemini takes audio input, so this is one extra call, not a research project.
- **The output clips.** -15.1 LUFS integrated but +0.6 dBTP as returned. The tool normalises
  the bed to -14 LUFS / -1.5 dBTP; `--no-normalize` opts out.

No per-word timestamps, so this covers the vox track (no burned captions) but not the
short-N caption track without a forced aligner behind it.

### Or run the voice yourself — `tools/gen_voice_local.py`

Added 2026-08-02. Same `beats.json` contract as `gen_voice.py`, but it POSTs to a TTS server
you host (RunPod, vLLM, anything) instead of ElevenLabs. No key, no per-character bill.

```bash
export LOCAL_TTS_URL=https://<pod-id>-8000.proxy.runpod.net/v1/audio/speech
export LOCAL_TTS_MODEL=<model-id>   LOCAL_TTS_VOICE=<voice-id>
python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json --dry-run
python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json
```

It defaults to the OpenAI `/v1/audio/speech` body shape; `LOCAL_TTS_BODY` takes a JSON
template for anything else. Verified end to
end against a stand-in server: generates per line, measures the real durations, **reports
which lines overflow their authored window**, mixes one timeline, and writes the measured
timings back into `beats.json`. `--retime` rewrites the windows from the audio instead of
keeping the estimates — use that when the VO is a different language or length from the
plan, and move the composition's `CUE` table with it.

#### The pod side: `tools/omnivoice_server.py`

The chosen model is [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) — Apache-2.0,
zero-shot, **646 languages**, and **Thai is 10th of them by training hours (~10,500 h)**, so
it is a first-class language for this model rather than a long-tail one.

OmniVoice ships a Python API, a CLI and a Gradio demo but **no HTTP server**, so
`gen_voice_local.py` has nothing to talk to on its own. `tools/omnivoice_server.py` is that
missing piece: copy it to the pod, and it speaks the OpenAI shape on `/v1/audio/speech`.

```bash
# on the pod
python omnivoice_server.py --port 8000 --device cuda:0 --language th \
    --instruct "male, middle-aged, warm, calm documentary narrator"
```

##### Picking the pod

**OmniVoice needs about 4 GB of VRAM** — its README reports it tested on an Arc A310 with
4 GB, and `audio_chunk_duration` keeps VRAM near-constant however long the text is. Every
GPU RunPod offers is therefore oversized for it, so choose on **price and availability, not
on VRAM**:

| GPU | $/hr | VRAM | availability | hours from a $3.89 balance |
|---|---|---|---|---|
| **RTX 4000 Ada** | 0.28 | 20 GB | Low | ~13.9 |
| RTX PRO 4000 | 0.57 | 24 GB | Medium | ~6.8 |
| **RTX 4090** | 0.69 | 24 GB | High | ~5.6 |
| RTX PRO 4500 | 0.74 | 32 GB | High | ~5.2 |
| RTX 5090 | 0.99 | 32 GB | High | ~3.9 |

Take **RTX 4000 Ada** when one is free and **RTX 4090** when it is not — both are Ada
generation, which has the widest CUDA/template support. Skip Blackwell (5090, B200): it
needs CUDA 12.8+, adds template friction, and buys VRAM this model will not touch.

**The bill is the install, not the inference.** At the quoted RTF of 0.025 the whole 41 s
of vox-2 narration is about one second of GPU time. What costs money is `pip install` plus
the first model download, so start from a template that already ships PyTorch + CUDA, give
it ~40 GB container disk, and **terminate** the pod afterwards rather than leaving it
stopped. A first end-to-end run should land around $0.10–0.25.

##### On the pod

```bash
pip install "omnivoice[tn]"          # [tn] = WeTextProcessing/num2words, so "1945" is spoken
                                     # as words. Without it the server retries unnormalised
                                     # and logs why, rather than failing the line.
# copy tools/omnivoice_server.py across, then:
python omnivoice_server.py --port 8000 --device cuda:0 --language th \
    --instruct "male, middle-aged, warm, calm documentary narrator"
curl http://127.0.0.1:8000/healthz   # {"ok": true, ...} before leaving the pod alone
```

Expose HTTP port **8000** on the pod so RunPod publishes it at
`https://<pod-id>-8000.proxy.runpod.net`.

Start in `--instruct` mode: voice design needs no reference clip, and it also avoids
OmniVoice auto-loading Whisper to transcribe one, which is extra download and extra VRAM.

**`--fit-window` is the reason this model suits the pipeline.** OmniVoice's `generate()`
takes a **`duration` in seconds** and synthesises to exactly that length. `beats.json`
already says how long each line has, so the audio arrives already fitting:

| | drift across the 6 vox-2 lines |
|---|---|
| without `--fit-window` | +0.72 · +0.32 · +0.19 · +0.26 · **+1.16** · −0.45 s |
| with `--fit-window` | **0.00 s on every line** |

(Measured against a stand-in server, one honouring `duration` and one ignoring it — the
second is there to prove the "server IGNORED `duration`" warning fires rather than passing
silently.) `gen_voice.py` has to atempo ElevenLabs output to make it fit, which is audible
past about 1.15×; this needs no stretching at all.

**Voice consistency is a channel decision**, and the server exposes all three OmniVoice
modes in descending order of repeatability:

1. `--voice-prompt my_voice.pt` — a saved `VoiceClonePrompt`. Byte-identical voice forever.
   This is the one to use once the channel has a voice it likes.
2. `--instruct "male, middle-aged, warm, calm"` — voice *design*, no reference clip needed.
   Similar voice each time, not identical. Fine for drafts.
3. neither — the model picks, and picks differently next run. Do not ship this; the server
   prints a warning when started that way.

Reference clips should be 3–10 s and **in the same language as the target**, or the output
carries an accent from the reference's language (OmniVoice's own note).

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
