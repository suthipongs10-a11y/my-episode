# STATUS — where every video stands

> **Read this second, right after `PIPELINE.md`.** It is the one thing that used to live only
> in a chat session: what is finished, what is half-done, and what the next obvious move is.
> A cleared conversation loses everything not written to a file — this file is that write-down.
>
> **Update it at the end of any session that finishes or starts a video.** A stale STATUS is
> worse than none, because it will be believed.
>
> Last updated: **2026-08-19** (vox-12 built — low back pain, health channel, 31 images,
> new entrance/transition motion language)

## Channels

| slug | name | voice | videos |
|---|---|---|---|
| `agri` | เกษตรที่คนไทยควรรู้ | Algieba | vox-2, vox-8, vox-11 |
| `health` | (สุขภาพแบบเข้าใจง่าย) | Leda | vox-3, vox-7, vox-12 |
| `ev` | The EV Insight | Umbriel | vox-4, vox-5, vox-6, vox-9, vox-10 |

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

**vox-8, vox-9, vox-10, vox-11 and vox-12 are the landscape videos.** Everything else is
1080×1920. That is correct — they are the five over 60s. See `PIPELINE.md` §3.

**`POST-KIT.md` supersedes `publish.th.md`.** vox-6 and vox-7 still carry both; the POST-KIT is
the current one (it is the form-filling checklist, not just copy). vox-2 has only the old file.

## Open work, in the order it is worth doing

0. **Everything produced so far is finished.** Twelve videos, ten of them voiced and rendered,
   all with captions. What remains on each is fact-checking, not production.

1. **vox-12's blocking fact-checks** — `vox-shorts/vox-12-back-pain/POST-KIT.md` §9, and this
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

2. **vox-11's blocking fact-checks** — `vox-shorts/vox-11-silicon-rice/POST-KIT.md` §9. The
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

3. **vox-2 and vox-3 still have no publish kit** — the last two videos without one.
   vox-2 needs the least work: it has an old `publish.th.md` and three covers already.
   vox-3 needs a cover too.
4. **vox-10's blocking fact-check** — `vox-shorts/vox-10-charge-curve/POST-KIT.md` §9. The
   hook number (10→80% takes 18–35 min; 80→100% takes another 25–45) is only grade **C**, and
   it is carrying the title, the cover AND the main graph. If it is wrong, all three change
   together. Check it before anything else on that video.
5. **vox-9's blocking fact-checks** — `vox-shorts/vox-9-spec-sheet/POST-KIT.md` §9. Fetching is
   blocked for EVERY domain now, not just the medical hosts in `PIPELINE.md` §0, so every spec
   figure is triangulated from search results and graded A/B/C in its `script.md`. The weak rows
   are Deepal S05's Thai availability, whether its CLTC figure is 610 or 620 (**the cover says
   620**), and which charging power the Thai MG S5 EV trim actually has.
6. **vox-8's blocking fact-checks** — `vox-shorts/vox-8-urea-deep/POST-KIT.md` §9. The Thai
   context figures (37% of cost, 41% of national fertiliser) and "millions of farmers" in
   Bangladesh are the weak rows. Do not publish before those.
7. **vox-7 has the same class of open checks**, for the same reason (§0: sources unreachable).

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
