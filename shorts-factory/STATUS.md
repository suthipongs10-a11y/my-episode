# STATUS — where every video stands

> **Read this second, right after `PIPELINE.md`.** It is the one thing that used to live only
> in a chat session: what is finished, what is half-done, and what the next obvious move is.
> A cleared conversation loses everything not written to a file — this file is that write-down.
>
> **Update it at the end of any session that finishes or starts a video.** A stale STATUS is
> worse than none, because it will be believed.
>
> Last updated: **2026-08-08** (vox-10 started; vox-9 and vox-10 both waiting on TTS quota)

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
| 4 | `vox-4-ev-800v` | ev | ❌ | ⚠️ **silent** | ❌ | ❌ |
| 5 | `vox-5-tesla-dry` | ev | ❌ | ⚠️ **silent** | ❌ | ❌ |
| 6 | `vox-6-sodium-ion` | ev | ✅ 14 | ✅ voiced | ✅ | ✅ 3 |
| 7 | `vox-7-hearing-dementia` | health | ✅ 25 | ✅ voiced | ✅ | ✅ 2 |
| 8 | `vox-8-urea-deep` | agri | ✅ 62 | ✅ voiced **16:9** | ✅ | ✅ 1 + upload jpg |
| 9 | `vox-9-spec-sheet` | ev | ⚠️ **16/48 — โควตา** | ❌ | ✅ | ✅ 1 + upload jpg |
| 10 | `vox-10-charge-curve` | ev | ❌ **0/67 — โควตา** | ❌ | ✅ | ✅ 1 + upload jpg |

**vox-8, vox-9 and vox-10 are the landscape videos.** Everything else is 1080×1920. That is
correct — they are the three over 60s. See `PIPELINE.md` §3.

**`POST-KIT.md` supersedes `publish.th.md`.** vox-6 and vox-7 still carry both; the POST-KIT is
the current one (it is the form-filling checklist, not just copy). vox-2 has only the old file.

## Open work, in the order it is worth doing

0. **Two videos are waiting on the same TTS quota, and it will not stretch to both.**
   Gemini TTS is capped at **100 requests per day per model**. vox-9 needs **32** lines,
   vox-10 needs **67** — 99 of 100, with no room for a single retry.
   **Do vox-9 to completion on the first reset day, vox-10 on the next.**
   The tool caches, so re-running the same command generates only what is missing.

   - **vox-9** → `python tools/gen_voice_gemini.py --beats vox-shorts/vox-9-spec-sheet/beats.json --retime`
     then `node scripts/gen-cues-vox9.mjs` → re-QA moved cues → render → mux.
     Full procedure: `vox-shorts/vox-9-spec-sheet/POST-KIT.md` §10.
   - **vox-10** → voice, `--retime`, THEN write the composition (it does not exist yet, by
     design — PIPELINE §7 voice-first). Layers and cover are already done.

   **Do not swap TTS models to dodge the quota** — measured, the 2.5 model reads ~23% faster
   and would drop both videos below their length targets, and mixing two engines inside one
   video is worse than waiting.

   **A single audition call may succeed while a real run fails.** Measured 2026-08-08: one
   `--audition` got through on the retry ladder, which briefly looked like the quota had
   reset. It had not — the 67-line run died on `RESOURCE_EXHAUSTED` a minute later. Do not
   conclude the quota is back from one lucky call; check by running the real job.
1. **vox-4 and vox-5 have no voice at all** — both rendered silent months ago and stalled there.
   They are the two cheapest finished videos available: script and composition already exist,
   they just need `gen_voice_gemini.py --voice Umbriel` and a mux.
2. **vox-2, vox-3, vox-4, vox-5 have no publish kit.** vox-2's needs the least work (it has an
   old `publish.th.md` and covers already).
3. **No SRT captions on anything.** Thai auto-captions on YouTube are poor, and every video's
   `beats.json` already carries exact per-line timings — an SRT is a pure transform of data we
   already have, for all 6 voiced videos.
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
- **`PIPELINE.md`** — 376 lines, the runbook, and the record of every mistake that cost time:
  orientation by length (§3), band collisions (§6), measured reading rates (§7), the sticky
  HTTP 400 (§7), title patterns and thumbnail pairing (§10), the 2 MB cover limit (§11)
- **`channels/*.json`** — voice, style, editorial rules, playlists per channel
- **per video** — `script.md` (facts + how each was sourced), `beats.json` (every timing),
  `POST-KIT.md`, `covers.th.md` (prompts + what was measured on the result)
- **`media/projects/<name>/`** — layers, covers, and the rejects kept as evidence
  (`sack-desert-reject.png`, `haze-sovietblocks-reject.png`, `A-minus40-english-reject.png`)

Not in git, but reproducible: `remotion/out/*.mp4` and `*/voice/*.wav` (both gitignored).
Re-rendering vox-8 takes about 40 minutes; regenerating its 62 voice lines costs API calls.
**If a render matters, download it before the container is reclaimed.**
