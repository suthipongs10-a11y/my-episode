# CLAUDE.md — claude-faceless-shorts-creator

A **faceless-shorts factory** driven by Claude Code. Three production tracks, one repo — the
right skill is picked automatically from the request:

| The user asks for… | Skill | Pixels come from | Projects live in |
|---|---|---|---|
| "make a short about X" (default) | `/make-short` | 100% TSX (Remotion animation) | `shorts/short-N-<niche>/` |
| "make an AI video short", "blue-man video" | `/make-ai-short` | a fal video model (locked recurring character) | `ai-shorts/<series>/` |
| "vox style / documentary / explainer short" | `/make-vox` | layered paper-collage (AI images + cutouts) | `vox-shorts/vox-N-<topic>/` |

All three share the same backbone: a `beats.json` contract, ElevenLabs voice with word-exact
captions (`gen_voice.py`), frame-by-frame QA at phone scale, library-first SFX (`/suggest-sfx`),
optional music bed, seamless frame-0==last-frame loops, no CTA outros. TSX crash rules live in
`/vidtsx-2d-generator`.

## Layout

```
tools/            Python tools: gen_voice, gen_sfx, gen_music, mix_sfx, mix_music, gen_chords,
                  gen_image, gen_clip, bakeoff_clip, cutout, capture_web
remotion/         the Remotion project — src/lib/ (shared + niche kits incl. collage.tsx),
                  src/shots/{short-N, ai-N, vox-N}/
media/            Remotion's public root: library/ (reusable: sfx, music, logos)
                  + projects/<proj>/ (media for ONE video — incl. committed AI clips & layers)
shorts/           TSX shorts: script.md, beats.json, sfx-plan.json each
ai-shorts/        generative shorts: + character.json (LOCKED reference), shot sidecars, IDEAS.md
channels/         ONE FILE PER YOUTUBE CHANNEL — voice, style, editorial rules, playlists.
                  A video's beats.json says "channel": "<slug>"; nothing else carries identity.
                  Read channels/README.md before adding a channel.
vox-shorts/       collage shorts: + DESIGN.md (the visual language — read before any vox work)
                  + IDEAS-<slug>.md, one topic bank per channel
brand.md          the style contract every skill reads (palette, motion, safe areas, SFX taste)
IDEAS.md          the TSX-shorts idea bank + niche ranking
.claude/skills/   make-short, make-ai-short, make-vox, vidtsx-2d-generator, suggest-sfx
```

## Runbook

**`PIPELINE.md` is the step-by-step for a Thai vox short, topic → published.** Read it before
starting a video; it carries the gotchas that already cost time once (browser executable, font
loading, Thai layout, Gemini TTS quirks, cover prompts). `SETUP.md` is the reference behind it.

**`STATUS.md` is where every video stands** — finished, half-done, and what is worth doing next.
Read it right after PIPELINE, and **update it at the end of any session that moves a video.**
It exists because a cleared conversation loses everything not written to a file, and the
per-video state was the one thing that had never been written down.

## Conventions (hard rules)

- **Run everything from the repo root.** Tools resolve engine paths (media/library, catalogs)
  against their own location, but project paths (`shorts/...`) against the CWD.
- **Python:** any Python 3.10+ — the core pipeline is stdlib-only. Only vox layer production
  needs extras: `pip install pillow rembg` (cutout.py) and `pip install playwright &&
  playwright install chromium` (capture_web.py). `ffmpeg`/`ffprobe` and `node`/`npx` on PATH.
- **API keys** live in `.env` at the repo root (copy `.env.example`). Never commit `.env`.
  ELEVENLABS_API_KEY = voice/SFX/music · FAL_KEY = AI clips + images · **GEMINI_API_KEY =
  images AND Thai TTS** — one key, two very different bills. `COSTS.md` has the real SKU
  breakdown: images 57%, voice 35%. Read it before generating a batch of layers.
- **Registry is generated:** after adding/renaming a shot, `cd remotion && npm run gen`
  (frames.mjs/render-all.mjs do NOT run it themselves).
- **Media rules:** `media/library/` is for CROSS-VIDEO reusable assets only (each with a
  catalog). Anything generated FOR ONE video (story frames, AI clips, collage layers) goes in
  `media/projects/<proj>/`, referenced as `staticFile('projects/<proj>/x')`. Reuse before you
  generate — check the catalogs first.
- **Committed vs gitignored media:** AI-generated clips and collage layers in
  `media/projects/` ARE committed (paid, non-reproducible pixels). `*/voice/` and `*/output/`
  are gitignored everywhere — but **`voice/` is only "regenerable" in the sense that money
  regenerates it.** It is a paid cache, it dies with the container, and the bill shows the same
  audio bought 3.3 times over (`COSTS.md` §3). Sync it off-container before a fresh session
  starts generating; `ai-shorts/*/shots/*.mp4` working copies too — the
  canonical clip lives in `media/projects/<name>/`.
- **Costs (ai-shorts only):** state the derived generation cost BEFORE spending it, and never
  regenerate a locked character from text (see /make-ai-short's iron rules).
- **Every scene sits on a photograph, never a flat fill** (`brand.md` §4a, locked 2026-08-18,
  all channels). One full-frame plate per scene dimmed 0.80–0.87, cut-out props on top, no
  faces, no landmarks. Count before rendering: `node remotion/scripts/check-scene-imagery.mjs`.
- **QA is not optional:** render frames at phone scale and READ them before any full render.
  Frames alone are not enough for anything that is an *absence* — a hole between scenes, a
  chapter carried by its headline. Sampled frames almost never land in a gap. Run
  `node remotion/scripts/check-chapter-pace.mjs` too; it reads the source, where a gap actually
  lives (`brand.md` §5.5).

## Cost rules (hard) — decided 2026-08-21 from the real invoice

`COSTS.md` has the measurement. These are the standing decisions that came out of it. They are
here rather than in COSTS.md because they bind every session, and a rule nobody reads is not a
rule.

1. **NEVER generate a cover image.** Write the prompt into `<project>/covers.th.md` and stop —
   **the operator generates covers himself.** This is not a cost heuristic, it is an
   instruction. Covers are the only images that carry Thai text and so the only ones that
   needed the expensive `pro` model; with them out of the pipeline, `pro` has no remaining use.
2. **`--model pro` is not used.** Every image this factory still generates is a plate or a
   cut-out prop — dimmed to 0.84 and put behind type, or run through `rembg`. `fast` is the
   default in `gen_image.py` and there is no longer a reason to override it.
3. **`--size` stays at 2K.** 1K and 2K are the *same* 1,120-token billing tier, so dropping
   resolution buys nothing and costs sharpness. (An earlier version of this file said the
   opposite. It was wrong.)
4. **The voice cache is paid inventory, not scratch.** `vox-shorts/*/voice/` was gitignored as
   "regenerable" and the bill shows the same audio bought **3.3 times over**, because the cache
   dies with the container. Before generating any voice, run `python tools/voice-cache.py
   restore`; after, run `python tools/voice-cache.py pack` and commit. It stores FLAC at ~55% of
   WAV and is lossless.
5. **Reuse a plate before generating one.** Every generated image is money that does not come
   back. Check `media/library/` and other projects' `layers/` first — a dimmed backdrop is not
   specific to its video the way a diagram is.
6. **We stay on the Gemini API.** Moving the text-free images to a cheap open model (FLUX and
   similar) would be ~22× cheaper and was considered and **declined by the operator** — do not
   reopen it. Thai script is why covers could never have moved anyway.
7. **Batch API is opt-in, not default.** It is a flat −50% on images and every image here is
   generated ahead of the render, so it fits — but the turnaround is up to 24 hours, which
   stalls a video for a day. Use it only when the operator asks for a batch run.
