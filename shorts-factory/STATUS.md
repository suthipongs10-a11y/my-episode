# STATUS — where every video stands

> **Read this second, right after `PIPELINE.md`.** It is the one thing that used to live only
> in a chat session: what is finished, what is half-done, and what the next obvious move is.
> A cleared conversation loses everything not written to a file — this file is that write-down.
>
> **Update it at the end of any session that finishes or starts a video.** A stale STATUS is
> worse than none, because it will be believed.
>
> Last updated: **2026-08-21** (vox-17 built — packing fresh produce; introduces **PhotoCard**,
> the first element in this kit that shows a photograph instead of dimming one, `brand.md` §4b)

## Channels

| slug | name | voice | videos |
|---|---|---|---|
| `agri` | เกษตรที่คนไทยควรรู้ | Algieba | vox-2, vox-8, vox-11, vox-14, vox-16, vox-17 |
| `health` | (สุขภาพแบบเข้าใจง่าย) | Leda | vox-3, vox-7, vox-12 |
| `ev` | The EV Insight | Umbriel | vox-4, vox-5, vox-6, vox-9, vox-10, vox-15 |
| `cosmos` | ถอดรหัสจักรวาล | Charon | vox-13 |

Voices must stay unique per channel — `channels/README.md` makes a duplicate a hard error.

## Videos

| # | project | channel | voice | render | publish kit | cover | captions |
|---|---|---|---|---|---|---|---|
| 1 | `vox-1-coffee` | `_demo` | — | — | — | — | — |
| 2 | `vox-2-thai-rice` | agri | ✅ 14 | ✅ voiced | ⚠️ old `publish.th.md` only | ✅ 3 | ✅ 10 |
| 3 | `vox-3-eight-glasses` | health | ✅ 22 | ✅ voiced | ❌ | ❌ | ✅ 11 |
| 4 | `vox-4-ev-800v` | ev | ✅ 6 | ✅ voiced | ✅ | ✅ 1 + upload jpg | ✅ 10 |
| 5 | `vox-5-tesla-dry` | ev | ✅ 6 | ✅ voiced **58s** | ✅ | ✅ 1 + upload jpg | ✅ 12 |
| 6 | `vox-6-sodium-ion` | ev | ✅ 14 | ✅ voiced | ✅ | ✅ 3 | ✅ 25 |
| 7 | `vox-7-hearing-dementia` | health | ✅ 25 | ✅ voiced | ✅ | ✅ 2 | ✅ 21 |
| 8 | `vox-8-urea-deep` | agri | ✅ 62 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg | ✅ 133 |
| 9 | `vox-9-spec-sheet` | ev | ✅ 48 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg | ✅ 109 |
| 10 | `vox-10-charge-curve` | ev | ✅ 67 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg | ✅ 129 |
| 11 | `vox-11-silicon-rice` | agri | ✅ 70 | ✅ voiced **16:9** · 24 ภาพ | ✅ | ✅ 1 + upload jpg | ✅ 118 |
| 12 | `vox-12-back-pain` | health | ✅ 50 | ✅ voiced **16:9** · **31 ภาพ** | ✅ | ✅ 1 + upload jpg | ✅ 108 |
| 13 | `vox-13-dark-sky` | **cosmos** | ✅ 44 | ✅ voiced **16:9** · 31 ภาพ + 5 แผนภาพโค้ด | ✅ | ✅ 1 + upload jpg | ✅ 93 |
| 14 | `vox-14-trichoderma` | agri | ✅ 51 | ✅ voiced **16:9** · 28 ภาพ + 6 แผนภาพโค้ด | ✅ | ✅ 1 + upload jpg | ✅ 114 |
| 15 | `vox-15-reev` | ev | ✅ 52 | ✅ voiced **16:9** · 19 ภาพ + 4 แผนภาพโค้ด | ✅ | ✅ 1 + upload jpg | ✅ 112 |
| 16 | `vox-16-bordeaux` | agri | ✅ 61 | ✅ voiced **16:9** · 29 ภาพ + 6 แผนภาพโค้ด | ✅ | ⛔ prompt only — operator generates | ✅ 108 |
| 17 | `vox-17-packing` | agri | ✅ 57 | ⏳ rendering **16:9** · 28 ภาพ + **8 PhotoCard** + 5 แผนภาพโค้ด | ✅ | ⛔ prompt only — operator generates | ⏳ |

**vox-8 onward are the landscape videos** (8 through 17). Everything else is 1080×1920.
That is correct — they are the ones over 60s. See `PIPELINE.md` §3.

**`POST-KIT.md` supersedes `publish.th.md`.** vox-6 and vox-7 still carry both; the POST-KIT is
the current one (it is the form-filling checklist, not just copy). vox-2 has only the old file.

## Open work, in the order it is worth doing

0. **Everything produced so far is finished.** Seventeen videos, fifteen of them voiced and
   rendered, all with captions. What remains on each is fact-checking, not production.

   ⚠️ **The rendered 4K masters are gone from disk** (2026-08-21). The container filled up,
   and they were deleted before anyone measured that the actual consumer was **22 GB of stale
   `/tmp/remotion-webpack-bundle-*`** left behind by previous renders. Nothing is lost that
   money cannot rebuild: the voice is committed as FLAC and
   every composition is in git, so re-rendering any of them costs machine time and **zero
   API spend**. `PIPELINE.md` §9 now says to check `/tmp` first.

1. **vox-17's blocking fact-checks — hands-on, so the bar is agri rule 8's, not rule 1's.**
   `vox-shorts/vox-17-packing/POST-KIT.md` §7. Items 2 and 3 are the spine: that vibration
   rather than impact is the dominant damage mechanism, and that a hard plastic crate with
   pulp trays tests WORSE than a corrugated box packed tight. The second is counter-intuitive
   and is the video's hook, so it has to be the strongest claim in it.

   What this video established, now in `brand.md` §4b: **PhotoCard**. Every plate in this kit
   is dimmed to 0.84 behind type, which is atmosphere, not evidence. A PhotoCard is the same
   image undimmed on a pale mount with its caption — a print on the board rather than a mood.
   It is ~480px tall at w=620, so pairs go side by side, never stacked; and because a bright
   photograph is exactly what a viewer measures their own against, it shows materials and
   technique only, never anything that is a measurement.

2. **vox-16's blocking fact-checks** — `vox-shorts/vox-16-bordeaux/POST-KIT.md` §7. Item 2 is
   the one that matters: the earthworm figures (25–50 mg/kg avoided, reached in 2–3 years,
   270 mg/kg = none found) are on screen as a chart AND in the pinned comment, so if one is
   wrong both have to change. **Its cover is deliberately ungenerated** — the prompt is in
   `covers.th.md` and the operator makes the image.

3. **vox-15's blocking fact-check is a structural claim, not a number** —
   `vox-shorts/vox-15-reev/POST-KIT.md` §7 item 1. Every other video in the repo rests its
   hook on a measured figure; this one rests on *"a REEV's engine has no mechanical path to
   the wheels"*. Some cars badged EREV in the Chinese market do have a high-speed clutch
   lock. If the Deepal S05 REEV is one of them, the title, the cover, and all four power-flow
   diagrams are wrong together — there is no one-line fix. Check it against manufacturer
   documentation before anything else.

   What this video established, worth knowing before the next one:

   - **The channel rule about naming the measurement condition earned its keep twice.** The
     ~170 km figure has no standard attached to it in any reachable source, so the number
     carries a red caveat line in the same card, not a passing mention.
   - **A number that applies to part of the operating envelope must say so in the frame.**
     The 15–20% conversion loss applies only while the engine is generating; on plug power it
     does not exist. Said carelessly it makes REEV sound far worse than it is, and the
     verification question in §7 exists purely to catch that misreading.
   - **`check-chapter-pace.mjs` is new, and it found this video after it had already shipped
     once.** Three chapters ran 11.1s, 14.9s and 20.2s on a headline alone; frame QA missed all
     three because ten frames out of 14,370 never land in a gap. The video was re-rendered with
     them filled — the 20.2s one turned out to be a missing half of a comparison, not slow
     pacing. The check now runs in CI, and it reports that **vox-12 (19.4s) and vox-13 (24.7s)
     have the same shape**. Both are grandfathered and neither is worth a re-render on its own,
     but if either is ever rebuilt for another reason, fix it in the same pass.

4. **vox-14's blocking fact-checks — and this one is the strictest in the repo.**
   `vox-shorts/vox-14-trichoderma/POST-KIT.md` §7. It is the channel's first **hands-on**
   video, and that changes the stakes rather than the style: an explainer that is wrong
   leaves somebody misinformed, a how-to that is wrong leaves somebody with a week gone and
   possibly an unidentified organism on their field. Three official Thai domains were
   blocked by the egress proxy (`esc.doae.go.th`, `kas.siamkubota.co.th`,
   `gardenandfarm.baanlaesuan.com`), so every step number is assembled from search results.
   **Check §7 item 2 first** — sources disagree on whether the finished culture is white or
   green, the video teaches "white = not done yet, green = ready", and getting that backwards
   sends people out with cultures that have not sporulated.

   What this video established, now in `channels/agri.json` as two new rules:

   - **Teach how to tell it FAILED, at greater length than how to do it.** If the viewer can
     read the result, our day count being a day out does not hurt them. The read-the-bag
     chapter is the longest in the film and the summary card exists because of it.
   - **An image doing the job of a test result may not be generated.** The colour of a
     culture, a diseased leaf, a nutrient-deficient soil — a viewer holds the real thing up
     against it. vox-14 draws its white/green/black states as a labelled colour key on a
     neutral pale card, and says on screen that it is a reference key rather than a photo.

5. **vox-13's blocking fact-checks** — `vox-shorts/vox-13-dark-sky/POST-KIT.md` §7. The one
   that matters is not a number, it is an **ordering**: the video says twice that the finite
   age is the main resolution and that the expansion is a contributing factor, and that claim
   is the spine of two whole chapters. Check it against the mainstream sources before
   anything else. Then Poe's quotation, which is on screen inside quote marks — if the
   translation does not match *Eureka*, drop the quote marks and paraphrase.

   Three things this video learned:

   - **An audition measures the wrong number.** Charon read 10.71 Thai characters a second at
     audition and **12.39** in the real video — a 16% gap, because the audition tool sends no
     `style` string and the channel's style carries the pace lever. A script written to the
     audition figure came out 10:07 against a 7–8 minute brief and had to be cut before the
     voice existed. Audition for TONE; get the RATE from the first real video, and write it
     into the channel file, which `channels/cosmos.json` now does.
   - **A new channel is a palette, a voice and a topic bank — not a new pipeline.** The
     `cosmos` skin is twelve lines in `collage.tsx`. Everything else was reused unchanged,
     including the vox-12 motion language.
   - **The fourth copy of a script is the one to delete.** `gen-cues-vox9/10/11/12.mjs` were
     byte-identical apart from two paths. They are now one `gen-cues.mjs` that finds its own
     work from each `beats.json`'s `composition` field, so vox-13 needed no new script. The
     consolidation also surfaced that vox-9 still carried a hand-written segment→cue map; its
     frames were identical, so the rename was mechanical and `tsc` proved it.

6. **vox-12's blocking fact-checks** — `vox-shorts/vox-12-back-pain/POST-KIT.md` §9, and this
   one matters more than the others because the subject is medical. Three rows, in order:
   Brinjikji's **37% → 96%** (it is the whole video and it is on screen as a graph), NICE
   NG59's **do-not-offer wording** (the video says "แนวทางระบุว่าไม่ควรให้" — that is a quote,
   not a paraphrase), and the **1.48% vs 0.12%** surgery pair, which is a single study and is
   labelled as one on screen. If that last one does not hold, **cut the 2:50 chapter entirely
   rather than adjusting the number** — the POST-KIT says so and it means it.

   What this video learned, and it is now in `brand.md` §5:

   - **A scene transition has two tracks and both must overlap.** The plate cross-dissolved
     correctly while the *content* left a forty-frame hole — the outgoing text finished
     fading before the incoming began rising, so a bare photograph sat on screen for over a
     second, ten times in the film. Invisible in the source, obvious in a rendered frame at
     the boundary. Render one and look at it.
   - **Progressive lists must not re-enter.** Revealing rows by swapping in a bigger copy of
     the card re-runs the card's entrance on every row. One card that mounts once, with
     per-row cues inside it.
   - **Count the images before the first render, not after the operator's note.** vox-11
     needed three renders to get there; vox-12 was built at 31 images (18 plates, 13 props)
     on the first one, from the same count.

7. **vox-11's blocking fact-checks** — `vox-shorts/vox-11-silicon-rice/POST-KIT.md` §9. The
   newest video and the one with the most load on a single figure: **silicon uptake of
   150–300 kg/ha**, because the whole second beat ("1.5–3× more than nitrogen") is arithmetic
   on top of it. Then the ~850°C crystallisation point, because the recommended title rests
   on it.

   Two things this video learned that apply to the next one:

   - **Count the scenes with no image before rendering.** The first cut had four images
     across twelve scenes and the operator's first note was that it looked thin; the second
     added objects but left nine scenes on flat navy, and the next note was that the
     background looked dull. Three renders to reach twenty-four images. **The check is two
     lines of counting and it is worth running before every first render**: how many scenes
     have no plate, and how many have no prop. The voice was reused untouched all three
     times, which is the only reason this was cheap rather than expensive.

   - **Do the keyword research BEFORE the render, not after the script.** It found that
     silicate fertiliser is sold in Thailand, which scoped the hook — and it found it at 19%
     of a render, which had to be thrown away. The search that sells the video is also the
     search that fact-checks its framing.
   - **A limit inferred from two samples is not a limit.** `PIPELINE.md` §11 had recorded
     "the model tops out near 1.6×" for cover number ratios from vox-8 and vox-10. vox-11
     measured 3.19× by asking for a bigger number in the prompt. Both earlier prompts had
     asked for the same thing as each other; nobody varied it.

8. **vox-2 and vox-3 still have no publish kit** — the last two videos without one.
   vox-2 needs the least work: it has an old `publish.th.md` and three covers already.
   vox-3 needs a cover too.
9. **vox-10's blocking fact-check** — `vox-shorts/vox-10-charge-curve/POST-KIT.md` §9. The
   hook number (10→80% takes 18–35 min; 80→100% takes another 25–45) is only grade **C**, and
   it is carrying the title, the cover AND the main graph. If it is wrong, all three change
   together. Check it before anything else on that video.
10. **vox-9's blocking fact-checks** — `vox-shorts/vox-9-spec-sheet/POST-KIT.md` §9. Fetching is
   blocked for EVERY domain now, not just the medical hosts in `PIPELINE.md` §0, so every spec
   figure is triangulated from search results and graded A/B/C in its `script.md`. The weak rows
   are Deepal S05's Thai availability, whether its CLTC figure is 610 or 620 (**the cover says
   620**), and which charging power the Thai MG S5 EV trim actually has.
11. **vox-8's blocking fact-checks** — `vox-shorts/vox-8-urea-deep/POST-KIT.md` §9. The Thai
   context figures (37% of cost, 41% of national fertiliser) and "millions of farmers" in
   Bangladesh are the weak rows. Do not publish before those.
12. **vox-7 has the same class of open checks**, for the same reason (§0: sources unreachable).

## What is NOT in git, and dies with the container

- **`<scratchpad>/tts.env`** — the RunPod TTS endpoint + key. Correctly not committed (public
  repo). **The operator must hold these himself; nothing here can restore them.** Currently
  unused anyway: Gemini TTS is the only reachable provider (`PIPELINE.md` §7).
- **`shorts-factory/.env`** — does not currently exist on this machine. Keys come from the
  environment.
- Scratchpad working files (~1.2 GB): cover drafts, `.orig.tsx` backups, an OmniVoice checkout.
  Anything there that mattered was copied into `media/projects/` or the video's folder already.

## What survives a cleared conversation

Everything below is in git and is read by a fresh session:

- **`CLAUDE.md`** — loaded automatically, every session, no prompting needed
- **`PIPELINE.md`** — the runbook, and the record of every mistake that cost time: orientation
  by length (§3), band collisions (§6), measured reading rates and the sticky HTTP 400 (§7),
  the TTS quota and why extra keys rarely help (§7), proving a background job is actually
  alive (§9), title patterns and thumbnail pairing (§10), the 2 MB cover limit (§11),
  captions and why a synthetic test fixture proved nothing (§12)
- **`channels/*.json`** — voice, style, editorial rules, playlists per channel
- **per video** — `script.md` (facts + how each was sourced), `beats.json` (every timing),
  `POST-KIT.md`, `covers.th.md` (prompts + what was measured on the result),
  `captions.th.srt` (regenerable, but committed — the wavs it is built from are not)
- **`media/projects/<name>/`** — layers, covers, and the rejects kept as evidence
  (`sack-desert-reject.png`, `haze-sovietblocks-reject.png`, `A-minus40-english-reject.png`)

Not in git, but reproducible: `remotion/out/*.mp4` and `*/voice/*.wav` (both gitignored).
Re-rendering vox-8 takes about 40 minutes; regenerating its 62 voice lines costs API calls.
**If a render matters, download it before the container is reclaimed.**
