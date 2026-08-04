# vox-2-thai-rice — "Same District. Four Thousand Years Apart."

44s vertical (1080×1920) · vox collage · **Thai throughout** — narration (Gemini TTS, `Algieba`)
and on-screen text (Kanit).

## STATUS: done. Voiced, rendered, muxed.

- script.md + beats.json authored, every fact verified (below)
- composition built, QA'd at 11 frames over two passes, 14 after the retime, 14 more after
  the Thai conversion
- **rendered: all 1,320 frames, 1080×1920 h264, 44s** (`remotion/out/Vox2ThaiRice.mp4`, gitignored)
- frames spot-checked back OUT of the MP4, not just from renderStill
- **voiced and muxed** → `remotion/out/Vox2ThaiRice-voiced.mp4`, 44.0s, -14.8 LUFS / -1.5 dBTP
- 4 generated layers (Gemini) — see "Layers: what is real and what is drawn"

Still open: the SFX pass.

### The voice, and the two takes it took

**Take 1 (2026-08-03) — the channel's own cloned voice**, from the self-hosted OmniVoice-Thai
server in the TTS repo. It generated cleanly and every number normalised correctly, but the
channel owner rejected the result on listening. That is the only test that matters for a
voice, and it failed. `voice-job.th.json` and `build-voice.sh` are kept as the record.

**Take 2 (2026-08-04) — Gemini TTS, voice `Algieba`**, via `tools/gen_voice_gemini.py`.
Chosen by auditioning six male voices on the actual hook line rather than from a spec sheet.
It is usage-billed and always up, which is the other half of why it won: the GPU pod bills by
the wall-clock hour whether it is speaking or idle, so every regeneration meant bringing a
machine up and down. Ten TTS providers were probed from this environment and Google was the
only one reachable at all.

What changed in the script because of it: nothing. The Thai lines are identical. Only the
`say` field on line 3 is new, and only because of the finding below.

### Two things the instruments caught, that listening-by-vibes would not have

**1. `ค.ศ. 1945` was read digit by digit.** The audio was transcribed back with Gemini and
came out *"คอ สอ หนึ่ง เก้า สี่ ห้า"*. Every other numeral in the script normalised properly —
`2000`, `199`, `105`, `31`, and `ค.ศ. 1959` two lines later, which is the identical
construct. So it is per-utterance, not configurable. `beats.json` now carries a `say`
override for that one line with the number pre-spelled; re-transcribed, it reads
*"คอ สอ หนึ่งพันเก้าร้อยสี่สิบห้า"*. **Do not assume the numbers were fine — transcribe and read.**

**2. The mux was silently cutting three seconds off the end.** `amix` ends with its longest
input and `-t` can only truncate, so the voice bed came out as long as the VO (41.1s) rather
than as long as the composition (44s) — and then `-shortest` trimmed the *picture* to the
voice. The loop back to frame 0, which is the entire ending, was being cut. Fixed with `apad`
before the clamp and no `-shortest`; the same bug was present in `gen_voice_local.py` and was
fixed there too.

Also: Gemini's output is hot — -15.1 LUFS integrated but **+0.6 dBTP**, i.e. clipping before
anything is mixed on top. The tool now normalises the bed to -14 LUFS / -1.5 dBTP.

### The measured VO

| segment | starts | length | take 1 (rejected) |
|---|---|---|---|
| `s01_hook` | 0.50s | 4.32s | 3.44s |
| `s02_origin` | 5.42s | 6.12s | 6.16s |
| `s03_accident` | 12.14s | 8.28s | 8.68s |
| `s04_selection` | 21.02s | 9.12s | 9.36s |
| `s05_crown` | 30.74s | 5.96s | 6.16s |
| `s06_twist` | 37.30s | 3.80s | 4.12s |

Bare, Algieba runs **51.78s** — far too long for a 44s cut, and Gemini has **no `duration`
parameter** to rein that in. What it does have is instruction-following: a Thai pace/tone
prefix is interpreted, not spoken (measured: −2.92s on a 10.88s line for "faster", +6.00s for
"slower"). A documentary-narrator instruction with a tight pace brings the take to **41.10s**,
within 0.3s of the rejected one — so the existing cut barely had to move.

**Retiming was mechanical, not eyeballed.** The old and new line boundaries were used as
anchors for a piecewise-linear time map, and all 18 cues plus all 11 camera keyframes were
pushed through it. A cue that sat on a phrase still sits on that phrase by construction. The
largest move was +26 frames; three cues moved backwards.

One measured quirk worth knowing: each Gemini clip carries ~0.3s of leading silence, so every
speech onset lands ~0.3s after its cue frame. That is the conventional direction — the picture
leads the narration — so it was left alone rather than trimmed and re-rendered.

### The on-screen text is Thai, set in Kanit

Done 2026-08-04. Thai narration over English chips was incoherent for the audience this is
aimed at; every string in the shot is now Thai. Same voice, same cues, same length — only the
words on screen changed.

**The typeface is Kanit, not the Noto pair that was already in the bundle.** Noto Sans/Serif
Thai are reference faces, deliberately neutral, and they carry no editorial voice at display
size. Kanit is a Thai geometric sans drawn with a matching latin, so `ข้าวขาวดอกมะลิ 105` is
one typeface end to end instead of two glued together — which is the usual tell of a
translated video. It is loaded in **both** the thai and latin subsets for exactly that reason.

One face, no display/body pair, and that is a choice. Thai has no serif tradition to set
against a sans the way latin editorial design does, so hierarchy comes from weight and size.
Reaching for a second Thai family would read as inconsistency, not hierarchy.

Four things the conversion needed that a find-and-replace would not have given:

1. **`LabelChip` sized its layer from `text.length`.** Thai writes vowels and tone marks as
   separate code points that render with zero advance, so `ข้าวขาวดอกมะลิ` counts 14 and shows
   11. Since the chip's box starts at `x - w/2`, every Thai chip was computing a fifth too
   wide and walking left by half of that. The estimate now drops the combining ranges.
2. **`SerifStatement` draws each chunk in its own box with a gap between.** In English those
   gaps *are* the word spaces. In Thai they landed inside words — `อำเภอ | เดียวกัน` — and read
   as broken text. Statements are now chunked on real Thai word boundaries, which usually
   means one chunk taking the whole highlight.
3. **Latin small-caps tracking (2.2px) is wrong for Thai** at kicker size. Now 0.6px.
4. **`11.68 Mt` does not fit the value column in Thai.** The unit moved into the card header
   (`· ล้านตัน`) and each row shows a bare number, rather than widening the column and
   squeezing the bars that carry the comparison.

None of this is hardcoded into the kit. `CollageBoard` takes `fontBody` / `fontDisplay` /
`tracking` and publishes them as CSS custom properties, so the whole subtree re-typefaces —
including anything nested that prop-drilling would have missed — and the latin shots are
untouched.

### What the QA pass actually caught

Not cosmetics — six things that would have shipped wrong:

1. Both date chips were **cropped off-screen** at the z=2.36 framing.
2. The Phanat Nikhom → Bang Khla route was 20 board px: an unreadable **scribble on the pin**.
   Cut, and replaced with a leader line to the label — an annotation, not a fake distance.
3. **"Number one. Thirty-one years." was still on screen while the card said Thailand is
   third.** Two contradictory claims in one frame.
4. The world map was **almost invisible** at phone scale.
5. Frame 0 was missing its highlight sweep and chip, so the **loop did not close**.
6. Neither date chip visibly connected to the pin — which is the entire thesis. Leader lines
   now attach both.

## The spine

The oldest confirmed rice in Thailand and the rice that made Thailand famous come from
**the same district**, four thousand years apart. That is not a framing device; it is where
the two sites actually are, and it is the reason this topic is worth 41 seconds.

## Facts (verified 2026-08-02, web)

| Claim | Source |
|---|---|
| Khok Phanom Di is in **Phanat Nikhom district, Chonburi** — a prehistoric mound on the lower Bang Pakong, excavated by Charles Higham 1984–85 | [Wikipedia](https://en.wikipedia.org/wiki/Khok_Phanom_Di), [Springer](https://link.springer.com/rwe/10.1007/978-1-4419-0465-2_983) |
| First **domesticated** rice in Thailand by macroremains: **2000–1500 BC**, from the coastal site KPD. Earlier interior claims (Ban Chiang) rest on rice-tempered pottery, which cannot show domestication | [Rice journal](https://thericejournal.springeropen.com/articles/10.1007/s12284-011-9070-2) |
| **1945** — a farmer, Jaroon Tanthawut, in **Phanat Nikhom, Chonburi**, noticed a fragrant variety and saved the seed | [Thailand Foundation](https://thailandfoundation.or.th/jasmine-rice-thailands-honorable-grain/) |
| **1951** — the seed reached **Bang Khla, Chachoengsao**; agriculture officer Sunthorn Seehanoen took it up. 199 panicles went into pure-line selection; **row 105** won on aroma and cooking quality | [Rice journal review](https://link.springer.com/article/10.1186/s12284-018-0212-7) |
| **1959** — the Rice Species Consideration Committee approved and named it **Khao Dawk Mali 105**, and seed distribution to farmers began | same |
| Thailand was the world's **largest rice exporter from 1981 to 2012**, losing the top spot to India in 2012 after the Paddy Pledging Scheme priced Thai rice out | [USDA ERS](https://www.ers.usda.gov/data-products/charts-of-note/chart-detail?chartId=76631), [Deccan Herald](https://www.deccanherald.com/business/india-topples-thailand-worlds-largest-2369387) |
| **2025 H1** — India 11.68 Mt, Vietnam 4.72 Mt, **Thailand 3.73 Mt (−27.3%)**: Vietnam passed Thailand into second | [SS Rice News](https://ssricenews.com/rice-news/top-news/vietnam-surpasses-thailand-to-become-worlds-second-largest-rice-exporter.html) |

**Deliberately not claimed:** that Ban Chiang is the oldest rice in Thailand (the evidence
does not carry that), and that KDML105 is the *reason* Thailand led the trade (it led on
volume white rice too — the script says the grain "carried Thailand to the top", which the
export record supports as a story, not as a single-cause claim).

## Beat sheet

| t (s) | beat | on screen | VO |
|---|---|---|---|
| 0–5 | HOOK | Title "Same district. Four thousand years apart." fully composed at **frame 0**; rice grains scattered below; chapter chip. Slow push. | Two things happened in the same Thai district, four thousand years apart. |
| 5–12 | ORIGIN | Real map of Thailand places (Natural Earth outlines, sepia on paper). Camera dives to Chonburi. Chip: Khok Phanom Di · ~2000 BC. | By two thousand BC, people here were already growing rice — the oldest confirmed in Thailand. |
| 12–20 | ACCIDENT | Same map, same pin. Second chip lands on the **same point**: 1945 · Phanat Nikhom. Both chips on screen together — that IS the payoff. | In 1945, in that same district, a farmer smelled jasmine in his field. He kept the seed. |
| 20–28.5 | 105 | Route north to Bang Khla, Chachoengsao; "199 panicles" chip; RubberStamp **105** slams; 1959 naming chip. | Out of a hundred ninety-nine panicles, row one-oh-five won. In 1959 it got a name: Khao Dawk Mali 105. |
| 28.5–35 | CROWN | Thailand map fades; **world map** places; dashed export routes fan out to Iraq, Nigeria, South Africa, Indonesia, China. Statement "Number one. Thirty-one years." | It carried Thailand to the top of the world's rice trade, and held it thirty-one years. |
| 35–41 | TWIST / LOOP | 2025 ranking bars: India 11.68 · Vietnam 4.72 · Thailand 3.73. Then the world map leaves and the title returns — last frame ≈ frame 0. | Today Thailand is third. India ships three times as much. |

Outro rule honoured: no CTA. The loop back to the title *is* the ending, and it re-reads
differently once you know both dates.

## Layers: what is real and what is drawn

`DESIGN.md` lists three layer sources. The split here is deliberate — **information is real,
texture is generated**, and the two never swap roles.

| Layer | Source | Real? |
|---|---|---|
| Thailand + world maps, borders, coastlines | **Natural Earth 110m** via `lib/geo/world.ts`, projected by `lib/map.tsx` | ✅ actual coordinates |
| Export routes, site pin, ranking bars | SVG in the TSX, from the numbers in the fact table | ✅ |
| Chips, statements, stamp, paper board, grain | `lib/collage.tsx` | — |
| Paper texture | reused from vox-1 | — |
| `rice-stalk` · `pot` · `farmer` · `paddy` | **Gemini** (`gen_image.py`) + `cutout.py` (rembg) | ❌ illustration |

The maps being real is not a cost-saving accident: `gen_image.py` maps have to be prompted
"NO text, no labels" because AI map text is gibberish, and their geography is decorative.
These borders are the actual coordinates, so a pin on Chonburi is *on Chonburi*.

### The rule the imagery follows

**No generated image is presented as a document.** The 1945 figure is drawn as a hand-inked
editorial illustration — visibly a drawing — and is captioned nowhere; it is "a rice farmer",
never *the* farmer. The paddy photo carries no caption, no date and no place. Nothing wears
an archival border plus a factual caption.

This is worth stating because vox-1 does the opposite: its Constantinople coffeehouse is an
AI image inside an `ArchivalPhoto` frame captioned *"A coffeehouse, Constantinople — 1555"*,
which reads as a historical document and is not one. For a channel whose whole pitch is
verified facts, that is a credibility leak. Don't repeat it.

`sacks.png` was generated and is **unused**: every position that fitted collided with the
crown statement, and the world map plus its fan of routes was already a complete image. It
is on disk if a later cut wants it.

## Production notes

- **Frame 0 is composed.** The hook's `SerifStatement`/grains use negative `at` so they are
  fully in at frame 0. (vox-1 does not do this — its frame 0 is bare paper. Fixed here.)
- Cue times are estimates from the beats windows. After `gen_voice.py` writes real word
  times, retime the `CUE` table in the shot: origin chip on "here", accident chip on "1945",
  stamp on "won", routes on "top", ranking on "third".
- `PaperMap` lives in the shot for now. It is generic enough to graduate to `lib/collage.tsx`
  once a second vox short wants a real map — do that then, not before.
- SFX pass when a key exists: paper slides on chip pops, a soft thud on each map place, one
  hero layer on the **105** stamp (riser → impact), route-draw scribbles, whoosh per camera
  move. Sparse and editorial; decorative cues `optional: true`.
