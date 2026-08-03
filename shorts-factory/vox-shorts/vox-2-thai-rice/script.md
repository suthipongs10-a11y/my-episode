# vox-2-thai-rice — "Same District. Four Thousand Years Apart."

41s vertical (1080×1920) · vox collage · voice: not yet generated (no ElevenLabs key —
`beats.json` carries estimated windows so `gen_voice.py` can retime them later).

## STATUS: rendered end to end, no API key spent

- script.md + beats.json authored, every fact verified (below)
- composition built, QA'd at 11 frames across two passes
- **rendered: all 1,230 frames, 1080×1920 h264** (`remotion/out/Vox2ThaiRice.mp4`, gitignored)
- frames spot-checked back OUT of the MP4, not just from renderStill
- 4 generated layers (Gemini) — see "Layers: what is real and what is drawn"

Missing before this is publishable: the voice track and the SFX pass. Everything visual is
done.

### The voice is the channel's own clone, and that changes the language

Decided 2026-08-03: narration comes from the channel's self-hosted voice server (the owner's
cloned voice, OmniVoice-Thai), not ElevenLabs. That server speaks **Thai**, so the VO does
too — `voice-job.th.json` here is the Thai script in that system's job format, mirrored to
`tts-ai/voice-jobs/vox-2-thai-rice.json` in the TTS repo where its HANDOFF.md says jobs live.

Two consequences, neither of them optional:

1. **The on-screen text should follow the narration into Thai.** Thai narration over English
   chips is incoherent for the audience it is now aimed at. The fonts are ready (Noto Serif
   Thai + Noto Sans Thai are in the bundle behind the latin faces, so one string covers both
   scripts), and Thai has been render-verified — but the conversion itself is a deliberate
   pass over every string in the shot, not a half-measure. Not done yet.
2. **`--fit-window` does not apply to this server.** Its `/tts` and `/job` endpoints take
   text only; there is no `duration`. It returns `timing.json` with the real seconds per
   segment instead, so the composition retimes to the audio rather than the audio being made
   to fit — the `CUE` table moves, using those measured lengths.

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
