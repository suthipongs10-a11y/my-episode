# Ink Drama Studio — ละครสั้นตัวเส้นหมึก พากย์ไทย

Claude: read this whole file before working. The owner writes the script (Thai), makes images in ChatGPT from our prompt pack, and buys Cartesia TTS credits. Claude does everything else. Goal: viewers follow the story and see the emotions — do not over-polish.

## Where this lives
A separate project inside the `my-episode` repo, beside `shorts-factory/`. The repo root's CLAUDE.md is the Ragnarok server project — none of it applies here. Two repo-wide CI checks do: every tracked `.py` must compile (`py_compile`), and no IPv4-looking literal (`1.2.3.4`) may appear in a tracked non-`.md` file (`tools/check-no-hardcoded-config.sh` at the repo root).

**Every per-episode command runs from `episodes/<slug>/`**; shared code is at `../../tools`, `../../tests`, `../../engine`. `episodes/README.md` has the full command list.

## Hard rules
- **Never build the clip before the ChatGPT images arrive.** Order is fixed: script → voices → art pack → (owner makes images) → build → verify → publish.
- Never write the Cartesia key into any file, and never ask the owner to paste it into chat. Read it from env `CARTESIA_API_KEY`. Ask before spending credits beyond the episode's lines.
- Keep dialogue verbatim in subtitles; TTS text may spell numbers as Thai words and turn stage directions into sounds ("เฮ้ออออ...", "แฮ่ก...", "ฮ่า ฮ่า").
- Images must contain NO text/numbers/logos — all Thai text is drawn in code.
- Characters in every sprite face RIGHT, mouth small and closed (we animate the mouth).
- Wide/medium shots by default (owner dislikes tight zoom), close-ups only for emotional beats. Subtitles always on.
- Communicate with the owner in Thai, short and practical.

## Folder layout
```
engine/base-template.html   page shell (UI, audio engine, playback, record-to-video). build.py slices it; never edit per episode
engine/voice.js             embedded-voice player (ducks music, recorded with the video)
tools/gen.py                Cartesia TTS per line  -> vo/*.wav, enc/*.mp3, durs.json
tools/envs.py               40 ms loudness envelope per line -> envs.json (lip-sync)
tools/extract.py            cut sprites from sheets (alpha or #00FF00 key) -> crops/ + check/csd_*.png
tools/grid.py               cut sheets by grid when soft glows merge figures
tools/heads.py, mouth.py    find head circle + mouth spot per pose -> heads.json, mouths.json + check/ overlays
tools/assets.py             encode sprites/backgrounds to webp data-URIs -> assets*.js
tests/screenshot.py         Playwright: screenshots at given times (look at them!)
tests/sweep.py              seek the whole timeline, report page errors
tests/voice_test.py         confirm every clip decodes and fires on time
artpack/                    example prompt-pack builder + Thai README template
refs/                       style sheets from earlier episodes, attached to every art pack (see refs/README.md)
examples/beer-16x9          finished 16:9 episode (one set, camera pans, calculator overlay, dream insert)
examples/dragon-9x16        finished 9:16 vertical episode (wide-hall world camera, close-ups, slow-mo, cliffhanger)
episodes/<slug>/            one folder per new episode
voices.example.json         the Thai Cartesia voices
requirements.txt            pip deps (plus ffmpeg/ffprobe on PATH)
```

`grid.py`, `extract.py`'s `__main__`, `assets.py`, `mkpack_example.py` and both `build.py`s carry the names and pixel bounds of the episode they were written for. Copy what you need into the episode folder and edit the copy.

## Pipeline per episode (episodes/<slug>/)
1. **Analyse script**: save it verbatim as `script.md`. Characters (body type, signature outfit colour/accessory), sets, props, key shots. Write `lines.json` = [{n, who, text, tts?, speed 0.8–1.25, vol 1–1.6}]. Split long lines at visual beats.
2. **Voices**: pick from `voices.example.json` → `voices.json`; run `tools/gen.py` (max 2 concurrent on free plan), then `tools/envs.py`. Report characters used (credits = characters). gen.py skips any line whose `enc/lNN.mp3` exists; `gen.py 3 7` re-buys only lines 3 and 7.
3. **Art pack**: copy `artpack/mkpack_example.py` → `mkpack.py` and `README-src_example.md` → `README-src.md`, write 9–12 English prompts (01 model sheet first; pose sheets per character covering every key shot; face close-ups; props; 2–3 backgrounds 16:9 or 9:16, one extra-wide 2:1 for pans) + Thai README; attach style refs from `refs/` or earlier `episodes/*/raw/`. Zip lands in `out/artpack/` → send it to the owner.
4. **Cut art** when images arrive in `raw/`: extract (merge 3–10) or grid; check contact sheet; heads + mouths; check overlay image; hand-fix bad mouth spots; assets.py.
5. **Build**: copy the closest example's episode.js + build.py. Timeline Q[n] from voice durations + PRE pauses. Write character state functions (pose key + x per time), shots (`shotAt(T)`), SFX events, music sections, overlays (Thai text, numbers). Stub any engine hook you do not use (e.g. `function ambInit(){}`). Output: `out/<slug>.html`.
6. **Verify**: screenshot ~12 key times and look; sweep for errors; voice_test must show all clips decoded.
7. **Publish** as an artifact with capabilities {downloads:{}}; tell the owner what's in it, credits used/left, known limits. Commit and push the episode folder.

## What is committed
Everything needed to rebuild an episode: script, lines/voices/durs/envs JSON, `enc/*.mp3` (paid), `raw/*.png` (the owner's hand work — not reproducible), crops/heads/mouths JSON (mouth spots are hand-fixed), episode.js, build.py and any copied cut script. Gitignored and rebuilt: `vo/` (big wav), `crops/`, `check/`, `out/`, `assets*.js`. A cloud container is deleted after the session, so anything not pushed is lost.

## Running in a Claude Code cloud session
- Deps are not preinstalled: `pip install -r requirements.txt` (add `--break-system-packages` if pip refuses). Playwright is pinned to 1.56.0 to match the preinstalled Chromium (`/opt/pw-browsers/chromium-1194`) — never run `playwright install`. ffmpeg is present.
- **`api.cartesia.ai` must be in the environment's allowed domains** (environment settings → Network access). As of 2026-10-18 it is not: CONNECT returns 403, so gen.py cannot run until the owner adds it.
- The key goes in the environment settings as `CARTESIA_API_KEY` (network secret or environment variable), picked up by the next session. Never in chat, never in a file.
- The owner's images arrive as chat uploads (or a push to the repo): copy them into `raw/` under the `out-<slug>-NN-*.png` names the art pack asked for.

## Lessons learned
- Glow/halo sheets merge figures → use grid.py with hand-tuned row/col bounds.
- Strict green key so green costumes survive: g>200, r<130, b<110, g−r>110 (extract.py uses it).
- Black-shirt characters confuse head detection → search only the top of the sprite; check overlay, fix by hand.
- One scale per sheet; consistent head size across characters.
- Vertical 9:16: W=540,H=960, `.screen` aspect 9/16, record 1080×1920; keep 4–5 people max in frame, spread ≥200 world px.
- Pair images (hug) can't lip-sync → cut to a close-up face while that line plays.
- Cartesia free plan: 20k chars/month, no commercial use; Pro $5/100k chars with commercial use.
