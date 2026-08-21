# Brand — the house style the example shorts ship with

> Style contract for every short this repo produces. The skills (make-short, vidtsx-2d-generator,
> suggest-sfx) read this file so all videos feel like one channel. **This is the look the 12 example
> shorts were built in — keep it, tweak it, or replace it wholesale with your own brand. If you
> change it, also update `remotion/src/brand.ts` (the same palette, as code).**

## 1. Identity & voice

- **Positioning:** modern **AI-studio** aesthetic — light, airy, whitespace, soft depth, tasteful
  motion. Reference polish: **Linear / Vercel / Anthropic**. Premium and calm, never loud or cluttered.
- **Voice:** direct, confident, no hype-filler. On-screen text avoids em-dashes.
- **Energy:** clean and premium, not MrBeast-loud. Motion is *tasteful*, not bouncy/cartoonish.
  (No hard offset shadows, thick black borders, or sticker-pop "Memphis" looks.)

## 1a. Thai narration register — **write it the way somebody would say it**

**Locked 2026-08-18, on the operator's note about vox-11: the Thai was accurate but too
clipped.** Correct is not the bar; *spoken* is. A line that reads like a caption is a line the
narrator has to perform instead of say.

- **Explain, do not compress.** If a line introduces a term, the same line says what it means.
  Two clauses beat one clause plus the viewer's guesswork.
- **Use the connectives people actually use** — `ทีนี้` `คือแบบนี้` `พูดง่าย ๆ ก็คือ`
  `ลองนึกภาพ` `ที่จริงแล้ว` `แล้วมันก็` — they carry the listener from clause to clause. Written
  Thai drops them; spoken Thai lives on them.
- **Prefer verbs to stacked nouns.** `การลดลงของประสิทธิภาพการดูดซึม` is a document.
  `มันดูดไปใช้ได้น้อยลง` is a person talking.
- **Longer lines, not more lines.** Target **100–140 characters** per `say` (vox-11 averaged 96
  and felt terse). Same length of video, fewer and fuller sentences.
- **The test is reading it out loud.** If you would not say it to a friend over lunch, rewrite
  it. Being unable to say a sentence in one breath is a different problem — split it.

**This does not license filler.** Expanding means adding *explanation*, never adding words that
carry nothing. The editorial rules about sources and caveats do not move.

## 2. Color palette (exact hex)

| Role | Name | Hex | Use in video |
|---|---|---|---|
| **Primary accent** | indigo | `#6366F1` | key words, highlights, active state, progress |
| Secondary accent | violet | `#9b7cc4` | pairs with indigo in gradients, secondary emphasis |
| Success / positive | teal | `#4db8a8` | "free", confirms, checkmarks, positive callouts |
| Success alt | green | `#4ecdc4` | teal companion for gradients/success |
| Warn / attention | yellow | `#f5d76e` | highlight sweeps, "watch this", attention pops |
| Danger / contrast | pink | `#e8879f` | errors, "the hard/expensive way", negative contrast |
| Ink (text/dark) | ink | `#1a1a2e` | primary text on light; base dark bg |
| Muted text | muted | `#6b6b7b` | secondary text, captions |
| Surface (paper) | paper | `#fffef7` | light full-screen bg, cards |
| Surface 2 (cream) | cream | `#faf8f5` | alt light band |

**Dark UI / terminal scale** (GitHub-ink — for terminal & code mockups):
`#0d1117` (bg) · `#161b22` (panel) · `#30363d` (border) · `#8b949e` (dim text) · `#c9d1d9` (text).

**Signature gradient:** indigo → violet → teal (`#6366F1 → #9b7cc4 → #4db8a8`). Used for dividers and
full-screen animated backgrounds.

## 3. Typography (3-font system)

| Role | Font | Weights | Use |
|---|---|---|---|
| **Display / headlines** | **Space Grotesk** | 500 / 600 / 700 | titles, big statements, kickers |
| **Body / UI** | **Inter** | 400 / 500 / 600 | subtitles, labels, captions |
| **Code / mono** | **JetBrains Mono** | 400 / 500 / 700 | terminal mockups, code, stats, tech labels |

All three load from `@remotion/google-fonts` (see `remotion/src/fonts.ts`) — nothing to install.
Headlines tight tracking; body normal; mono for anything literally code/terminal/numbers.

## 4. Shape & depth

- **Radius:** ~14px (cards/panels), pills fully rounded. Terminal/code windows: ~10px with a title bar.
- **Depth:** soft shadows (e.g. `0 8px 32px rgba(0,0,0,.10)`), 1px light borders. Airy.
- **Never:** hard offset shadows (`4px 4px 0 #000`), 3px black borders, sticker/pop look.
- **Window chrome** (browser/terminal mockups): rounded panel, top bar with 3 traffic-light dots
  + a mono label; content on the dark ink scale.

## 4a. Scene backgrounds — **every scene sits on a photograph, never a flat fill**

**Locked 2026-08-18, on the operator's instruction, and it applies to every video on every
channel from here on.** A scene whose background is a single flat colour reads as a slide, not
as a film. The fix is one full-frame photograph per scene, dimmed back until the type wins.

- **One plate per scene, minimum.** Count the scenes with no plate BEFORE the first render
  (`node remotion/scripts/check-scene-imagery.mjs`). vox-11 needed three full renders to reach
  this because the count was never taken — see PIPELINE.md §4.
- **The plate is subject matter, not wallpaper.** Pick the image the scene is about: the
  seedling beat gets seedlings, the harvest beat gets a harvest. A scene backed by a photo of
  something else is worse than a flat fill, because now it is also lying.
- **Dim is per image, not a constant.** A bright noon sky needs more of the base colour over it
  than a dusk field does. Typical 0.80–0.87 over the paper colour. **The test is whether the
  headline still reads at 320px, not whether the photo looks good.**
- **Props on top.** Cut-out objects on white keep the foreground; the plate is depth behind
  them. A scene with a plate and no prop is flat in a different way.
- **People: no faces.** These are faceless channels. Backs, hats, hands, distant figures. This
  also happens to satisfy "never assert a person", so there is no trade to make.
- **Places: no landmarks.** A recognisable skyline or monument claims a location the script has
  no source for. Anonymous is both safer and more reusable (PIPELINE.md §4, the vox-7 case).

## 5. Motion language — calm & premium

- **Entrances:** fade + rise. `opacity 0→1` and `translateY 24px→0` over ~7 frames at the shorts'
  30fps, ease-out (or spring: damping 200, mass 0.8, stiffness 120). No overshoot, no bounce.
- **Exits:** fade + fall, a bit faster than entrances.
- **Emphasis:** indigo highlight/underline wipe behind a key word; scale pop max 1.03–1.06.
- **Stagger:** 3–4 frames between list items / lines.
- **Backgrounds:** slow drifting indigo/violet/teal gradient blobs + a faint dotted grid, 8–20s loops.
- **Feel:** premium, restrained, "Linear/Anthropic." No spins, no elastic, no hard snaps.

### ⬛ Spend the motion on the ENTRANCE — text must not idle-drift

**Locked 2026-08-18, operator's instruction.** Three rules, in priority order:

1. **Type never breathes.** `drift={0}` on every layer that carries words. The collage kit's
   idle drift was designed for paper scraps; on a headline it reads as a wobble and it makes
   Thai with its stacked marks look unstable. Photographs and cut-out objects may keep a small
   drift — they are objects, and stillness there looks pasted.
2. **The entrance is where the craft goes.** A line or an image arriving should be worth
   watching: fade + rise + a touch of scale, ~14–18 frames, ease-out, no overshoot on text.
   This is the moment the viewer's eye moves; everything after it should hold still and be
   read.
3. **Scenes need a transition, not a cut.** A hard swap between two full-frame photographs is
   jarring at eight minutes. Cross-dissolve the plate over ~20 frames and let the incoming
   scene's first element rise into it.

   **The plate and the words are two tracks, and both have to overlap.** vox-12's first build
   dissolved the plate correctly and still had a hole in it: the outgoing scene's content
   finished fading ten frames *before* the next scene began, and the next scene's first line
   then took sixteen frames to rise — about forty frames, more than a second, of a bare
   photograph with nothing on it. It is invisible in the source and obvious on screen. The fix
   is a positive overlap: **the outgoing content lingers past the incoming scene's first cue
   and fades across it** (vox-12 uses +14 frames of linger and a 26-frame fade against a
   26-frame plate dissolve), so the two are on screen together and neither one is ever alone.
   Render a frame at the boundary and look at it — that is the only way this shows up.

4. **A list that grows must not re-enter.** The obvious way to reveal list rows one at a time
   is to swap in a new copy of the card with one more row. Don't: the card's own entrance
   animation re-runs on every swap, so the whole figure re-rises each time a row appears, and
   any gap between the copies flashes. Give the rows their own per-row cues inside one card
   that mounts once (`ats={[...]}` in vox-12) — the card arrives, then the rows arrive into it.

5. **A chapter may not run long on its headline alone.** vox-15 shipped with three chapters —
   11.1s, 14.9s and 20.2s — showing nothing but a title over a dimmed photograph, and frame QA
   did not catch it: ten sampled frames out of 14,370 land almost anywhere except in a gap. A
   gap is a property of the *source*, so measure the source. `node
   remotion/scripts/check-chapter-pace.mjs` reports the distance from each chapter's start to
   the first entrance of anything that is not a `<Head>`, and CI fails over 10s.

   **The number is a prompt, not a verdict.** A plate that is doing real work can carry a long
   beat. But look at what the check finds, because sometimes the gap is not pacing at all:
   vox-15's twenty seconds were one half of a comparison — an ordinary car converts energy
   once, a REEV converts it three times — with only the second half ever drawn. Filling it
   meant drawing the first half, which made the point countable instead of asserted. **A long
   headline-only stretch is often a missing argument wearing a pacing costume.**

**And plates should move, slowly.** A still photograph held for 40 seconds goes dead. A Ken
Burns drift — 1.00→1.06 zoom with a few pixels of pan across the scene — reads as life without
ever pulling attention off the type. It costs nothing and it is the difference between a video
and a slideshow.

## 6. Delivery specs (shorts)

- **Canvas:** 1080×1920 (vertical), **30 fps**, ~38–42s.
- **Safe areas:** captions block centered ~y1500; nothing critical in the bottom 340px (YouTube UI)
  or the right 160px (like/share rail). Keep text ≥ 5% from edges.
- **Frame 0 is the thumbnail** — fully composed, payoff visible, no fade-from-black.

## 7. Sound design — SFX

Same energy as the motion: **calm/premium, felt-not-heard.** SFX are seasoning on the edit, never
the show. Choose every cue by its FUNCTION (3+1 foundational sounds do the heavy lifting):

| Function | Sound | Its job | Calm sub-types |
|---|---|---|---|
| **Motion** | whoosh | direction/speed; carry one beat into the next | `whoosh-soft`, `whoosh-wind` |
| **Tension** | riser | "something is coming"; hold before a reveal | `riser-soft` (NO cymbal-urgency) |
| **Emphasis** | impact / pop | "this moment matters"; lands on the reveal | `impact-soft`, `impact-deep-soft`, `pop-reveal` |
| **Snap** | click | small, satisfying, alive | `ui-click-soft`, `ui-toggle-on`, `ui-send` |

Plus extras like `page-flip` (storybook) and `chime-reward` (the gift moment).

- **Under the voice, always.** Quiet, tasteful, never louder than the narration. Silence is part of
  the mix; never wall-to-wall.
- **Layer the big moments (build-and-drop):** riser → impact on a scripted reveal, whoosh → pop on a
  cut. A layer is two events at the same/adjacent `at_s`. Reserve for the 2–3 hero beats.
- **Density:** score key transitions, reveals, and one-gesture click-sequences — not every sub-frame.
  Everything genuinely deniable is `"optional": true`.
- **Sync to the VISUAL beat and often the exact word.** Off-by-100ms reads as sloppy — use real frame
  and word times, never guesses.
- **Levels.** Library clips are normalized to ~−20 LUFS with a −1.5 dBFS peak ceiling, so per-cue
  `gain_db` is perceptually meaningful. **Shorts calibration:** under a short's near-continuous
  narration a conservative gain table runs 4–8 dB too quiet — start at transitions/whooshes **−3**,
  story pops/impacts **0..+3**, stamps/snaps **0..+7**, layered-hero risers **0..+2**.
- **No static/glitch textures under narration** — they read as NOISE over the voice at any gain.
  Error/delete moments during speech get silence or one clean mechanical snap; save glitch textures
  for gaps where the voice is silent.
- **Diegetic action sounds are the content** in a fully-synthetic short (piece thocks, digit pops) and
  may exceed long-form density.
- **Source.** ElevenLabs Sound Effects API is primary (owned, consistent, reusable); curated
  royalty-free is the fallback. Every clip's `source` + `license` is recorded in the catalog.
- **Library is the durable asset** — shared, cross-project at `media/library/sfx/` (`catalog.json` +
  `clips/`), seeded from `palette.json`. It grows with every video; reuse before generating.
