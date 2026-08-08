# STATUS — where every video stands

> **Read this second, right after `PIPELINE.md`.** It is the one thing that used to live only
> in a chat session: what is finished, what is half-done, and what the next obvious move is.
> A cleared conversation loses everything not written to a file — this file is that write-down.
>
> **Update it at the end of any session that finishes or starts a video.** A stale STATUS is
> worse than none, because it will be believed.
>
> Last updated: **2026-08-08** (vox-9 started)

## Channels

| slug | name | voice | videos |
|---|---|---|---|
| `agri` | เกษตรที่คนไทยควรรู้ | Algieba | vox-2, vox-8 |
| `health` | (สุขภาพแบบเข้าใจง่าย) | Leda | vox-3, vox-7 |
| `ev` | The EV Insight | Umbriel | vox-4, vox-5, vox-6, vox-9 |

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
| 9 | `vox-9-spec-sheet` | ev | ✅ 48 **16:9** | ⚠️ **16/48 — โควตา** | ✅ | ✅ 1 + upload jpg |

**vox-8 and vox-9 are the landscape videos.** Everything else is 1080×1920. That is correct —
they are the two over 60s. See `PIPELINE.md` §3.

**`POST-KIT.md` supersedes `publish.th.md`.** vox-6 and vox-7 still carry both; the POST-KIT is
the current one (it is the form-filling checklist, not just copy). vox-2 has only the old file.

## Open work, in the order it is worth doing

0. **vox-9 needs its last 32 voice lines**, and it is the cheapest finished video available
   the moment the quota resets. Gemini TTS is capped at **100 requests per day per model** and
   returned `RESOURCE_EXHAUSTED` at line 16 on 2026-08-08; the reset is ~22h. The tool caches,
   so re-running the same command generates only the missing lines. Then:
   `node scripts/gen-cues-vox9.mjs` → re-QA the scenes whose cues moved → render → mux.
   Full procedure and the do-not-do-this list: `vox-shorts/vox-9-spec-sheet/POST-KIT.md` §10.
   **Do not swap TTS models to dodge the quota** — measured, the 2.5 model reads ~23% faster
   and would drop the video below the 7-minute floor the operator asked for.
1. **vox-4 and vox-5 have no voice at all** — both rendered silent months ago and stalled there.
   They are the two cheapest finished videos available: script and composition already exist,
   they just need `gen_voice_gemini.py --voice Umbriel` and a mux.
2. **vox-2, vox-3, vox-4, vox-5 have no publish kit.** vox-2's needs the least work (it has an
   old `publish.th.md` and covers already).
3. **No SRT captions on anything.** Thai auto-captions on YouTube are poor, and every video's
   `beats.json` already carries exact per-line timings — an SRT is a pure transform of data we
   already have, for all 6 voiced videos.
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
