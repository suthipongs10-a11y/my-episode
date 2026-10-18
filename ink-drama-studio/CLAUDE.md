# Ink Drama Studio — ละครสั้นตัวเส้นหมึก พากย์ไทย

Claude: read this whole file before working. The owner writes the script (Thai), makes images in ChatGPT from our prompt pack, and buys Cartesia TTS credits. Claude does everything else. Goal: viewers follow the story and see the emotions — do not over-polish.

## Hard rules
- **Never build the clip before the ChatGPT images arrive.** Order is fixed: script → voices → art pack → (owner makes images) → build → verify → publish.
- Never write the Cartesia key into any file. Read it from env `CARTESIA_API_KEY`. Ask before spending credits beyond the episode's lines.
- Keep dialogue verbatim in subtitles; TTS text may spell numbers as Thai words and turn stage directions into sounds ("เฮ้ออออ...", "แฮ่ก...", "ฮ่า ฮ่า").
- Images must contain NO text/numbers/logos — all Thai text is drawn in code.
- Characters in every sprite face RIGHT, mouth small and closed (we animate the mouth).
- Wide/medium shots by default (owner dislikes tight zoom), close-ups only for emotional beats. Subtitles always on.
- Communicate with the owner in Thai, short and practical.

## Folder layout
```
engine/base-template.html   page shell (UI, audio engine, playback, record-to-video)
engine/voice.js             embedded-voice player (ducks music, recorded with the video)
tools/gen.py                Cartesia TTS per line  -> vo/*.wav, enc/*.mp3, durs.json
tools/envs.py               40 ms loudness envelope per line -> envs.json (lip-sync)
tools/extract.py            cut sprites from sheets (alpha or #00FF00 key) -> crops/ + contact sheet
tools/grid.py               cut sheets by grid when soft glows merge figures
tools/heads.py, mouth.py    find head circle + mouth spot per pose -> heads.json, mouths.json
tools/assets.py             encode sprites/backgrounds to webp data-URIs -> assets*.js
tests/screenshot.py         Playwright: screenshots at given times (look at them!)
tests/sweep.py              seek the whole timeline, report page errors
tests/voice_test.py         confirm every clip decodes and fires on time
artpack/                    example prompt-pack builder + Thai README template
examples/beer-16x9          finished 16:9 episode (one set, camera pans, calculator overlay, dream insert)
examples/dragon-9x16        finished 9:16 vertical episode (wide-hall world camera, close-ups, slow-mo, cliffhanger)
episodes/<slug>/            one folder per new episode
```

## Pipeline per episode (episodes/<slug>/)
1. **Analyse script**: characters (body type, signature outfit colour/accessory), sets, props, key shots. Write `lines.json` = [{n, who, text, tts?, speed 0.8–1.25, vol 1–1.6}]. Split long lines at visual beats.
2. **Voices**: pick from `voices.example.json` → `voices.json`; run `tools/gen.py` (max 2 concurrent on free plan), then `tools/envs.py`. Report characters used (credits = characters).
3. **Art pack**: copy `artpack/mkpack_example.py`, write 9–12 English prompts (01 model sheet first; pose sheets per character covering every key shot; face close-ups; props; 2–3 backgrounds 16:9 or 9:16, one extra-wide 2:1 for pans) + Thai README; attach style refs from earlier episodes. Zip → owner.
4. **Cut art** when images arrive: extract (merge 3–10) or grid; check contact sheet; heads + mouths; check overlay image; hand-fix bad mouth spots; assets.py.
5. **Build**: copy the closest example's episode.js + build.py. Timeline Q[n] from voice durations + PRE pauses. Write character state functions (pose key + x per time), shots (`shotAt(T)`), SFX events, music sections, overlays (Thai text, numbers). Stub any engine hook you do not use (e.g. `function ambInit(){}`).
6. **Verify**: screenshot ~12 key times and look; sweep for errors; voice_test must show all clips decoded.
7. **Publish** as an artifact with capabilities {downloads:{}}; tell the owner what's in it, credits used/left, known limits.

## Lessons learned
- Glow/halo sheets merge figures → use grid.py with hand-tuned row/col bounds.
- Strict green key so green costumes survive: g>200, r<130, b<110, g−r>110.
- Black-shirt characters confuse head detection → search only the top of the sprite; check overlay, fix by hand.
- One scale per sheet; consistent head size across characters.
- Vertical 9:16: W=540,H=960, `.screen` aspect 9/16, record 1080×1920; keep 4–5 people max in frame, spread ≥200 world px.
- Pair images (hug) can't lip-sync → cut to a close-up face while that line plays.
- Cartesia free plan: 20k chars/month, no commercial use; Pro $5/100k chars with commercial use.
