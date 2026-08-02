# vox-2-thai-rice — "Same District. Four Thousand Years Apart."

41s vertical (1080×1920) · vox collage · voice: not yet generated (no ElevenLabs key —
`beats.json` carries estimated windows so `gen_voice.py` can retime them later).

## STATUS: rendered end to end, no API key spent

- script.md + beats.json authored, every fact verified (below)
- composition built, QA'd at 11 frames across two passes
- **rendered: all 1,230 frames, 1080×1920 h264** (`remotion/out/Vox2ThaiRice.mp4`, gitignored)
- frames spot-checked back OUT of the MP4, not just from renderStill
- **zero AI images, zero API calls** — see "Why there are no generated layers"

Missing before this is publishable: the voice track (needs `ELEVENLABS_API_KEY`) and the
SFX pass. Everything visual is done.

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

## Why there are no generated layers

`DESIGN.md` lists three layer sources; only one needs an API key.

| Layer here | Source | Key? |
|---|---|---|
| Thailand + world maps, borders, coastlines | **Natural Earth 110m** via `lib/geo/world.ts`, projected by `lib/map.tsx` | ❌ |
| Export routes, pins, rice grains, ranking bars | SVG authored in the TSX | ❌ |
| Chips, statements, stamp, paper board, grain | `lib/collage.tsx` | ❌ |
| Paper texture | reused from vox-1 (`projects/vox-1-coffee/layers/paper.png`) | ❌ |

The maps being real is not a cost-saving accident — `gen_image.py` maps have to be prompted
"NO text, no labels" because AI map text is gibberish, and their geography is decorative.
These borders are the actual coordinates, so a pin on Chonburi is *on Chonburi*.

**What a Gemini key would still add:** an archival-photograph layer for the 1945 beat and a
die-cut rice-stalk cutout for the hook — texture, not information. Worth doing; not blocking.

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
