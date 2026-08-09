# STATUS — where every video stands

> **Read this second, right after `PIPELINE.md`.** It is the one thing that used to live only
> in a chat session: what is finished, what is half-done, and what the next obvious move is.
> A cleared conversation loses everything not written to a file — this file is that write-down.
>
> **Update it at the end of any session that finishes or starts a video.** A stale STATUS is
> worse than none, because it will be believed.
>
> Last updated: **2026-08-09** (all four EV videos finished — vox-4, vox-5, vox-9, vox-10)

## Channels

| slug | name | voice | videos |
|---|---|---|---|
| `agri` | เกษตรที่คนไทยควรรู้ | Algieba | vox-2, vox-8 |
| `health` | (สุขภาพแบบเข้าใจง่าย) | Leda | vox-3, vox-7 |
| `ev` | The EV Insight | Umbriel | vox-4, vox-5, vox-6, vox-9, vox-10 |

Voices must stay unique per channel — `channels/README.md` makes a duplicate a hard error.

## Videos

| # | project | channel | voice | render | publish kit | cover |
|---|---|---|---|---|---|---|
| 1 | `vox-1-coffee` | `_demo` | — | — | — | — |
| 2 | `vox-2-thai-rice` | agri | ✅ 14 | ✅ voiced | ⚠️ old `publish.th.md` only | ✅ 3 |
| 3 | `vox-3-eight-glasses` | health | ✅ 22 | ✅ voiced | ❌ | ❌ |
| 4 | `vox-4-ev-800v` | ev | ✅ 6 | ✅ voiced | ✅ | ✅ 1 + upload jpg |
| 5 | `vox-5-tesla-dry` | ev | ✅ 6 | ✅ voiced **58s** | ✅ | ✅ 1 + upload jpg |
| 6 | `vox-6-sodium-ion` | ev | ✅ 14 | ✅ voiced | ✅ | ✅ 3 |
| 7 | `vox-7-hearing-dementia` | health | ✅ 25 | ✅ voiced | ✅ | ✅ 2 |
| 8 | `vox-8-urea-deep` | agri | ✅ 62 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg |
| 9 | `vox-9-spec-sheet` | ev | ✅ 48 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg |
| 10 | `vox-10-charge-curve` | ev | ✅ 67 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg |

**vox-8, vox-9 and vox-10 are the landscape videos.** Everything else is 1080×1920. That is
correct — they are the three over 60s. See `PIPELINE.md` §3.

**`POST-KIT.md` supersedes `publish.th.md`.** vox-6 and vox-7 still carry both; the POST-KIT is
the current one (it is the form-filling checklist, not just copy). vox-2 has only the old file.

## Open work, in the order it is worth doing

0. **Every EV video is finished.** vox-4, vox-5, vox-9 and vox-10 are all rendered, muxed and
   stream-verified, each with a cover and a publish kit. What remains on them is fact-checking,
   not production — see the numbered items below.

   The TTS quota wall that blocked vox-9 and vox-10 is gone: the operator supplied extra keys
   from **separate Google Cloud projects** (as a comma-separated list in `GOOGLE_TTS_API_KEY`),
   and the tool reports `keys: 3 available`. Quota was never hit again across ~120 lines.
   Still true, and still the thing to remember: **keys from the SAME project share one pool**
   and add nothing — `PIPELINE.md` §7.

1. **Thai SRT captions for all nine voiced videos.** Now the biggest single win available:
   every `beats.json` carries exact measured per-line timings, so an SRT is a pure transform
   of data already on disk. YouTube's Thai auto-captions are poor.

2. **vox-2 and vox-3 still have no publish kit** — the last two videos without one.
   vox-2 needs the least work: it has an old `publish.th.md` and three covers already.
   vox-3 needs a cover too.
3. **vox-10's blocking fact-check** — `vox-shorts/vox-10-charge-curve/POST-KIT.md` §9. The
   hook number (10→80% takes 18–35 min; 80→100% takes another 25–45) is only grade **C**, and
   it is carrying the title, the cover AND the main graph. If it is wrong, all three change
   together. Check it before anything else on that video.
4. **vox-9's blocking fact-checks** — `vox-shorts/vox-9-spec-sheet/POST-KIT.md` §9. Fetching is
   blocked for EVERY domain now, not just the medical hosts in `PIPELINE.md` §0, so every spec
   figure is triangulated from search results and graded A/B/C in its `script.md`. The weak rows
   are Deepal S05's Thai availability, whether its CLTC figure is 610 or 620 (**the cover says
   620**), and which charging power the Thai MG S5 EV trim actually has.
5. **vox-8's blocking fact-checks** — `vox-shorts/vox-8-urea-deep/POST-KIT.md` §9. The Thai
   context figures (37% of cost, 41% of national fertiliser) and "millions of farmers" in
   Bangladesh are the weak rows. Do not publish before those.
6. **vox-7 has the same class of open checks**, for the same reason (§0: sources unreachable).

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
  alive (§9), title patterns and thumbnail pairing (§10), the 2 MB cover limit (§11)
- **`channels/*.json`** — voice, style, editorial rules, playlists per channel
- **per video** — `script.md` (facts + how each was sourced), `beats.json` (every timing),
  `POST-KIT.md`, `covers.th.md` (prompts + what was measured on the result)
- **`media/projects/<name>/`** — layers, covers, and the rejects kept as evidence
  (`sack-desert-reject.png`, `haze-sovietblocks-reject.png`, `A-minus40-english-reject.png`)

Not in git, but reproducible: `remotion/out/*.mp4` and `*/voice/*.wav` (both gitignored).
Re-rendering vox-8 takes about 40 minutes; regenerating its 62 voice lines costs API calls.
**If a render matters, download it before the container is reclaimed.**
