# channels/ — one file per YouTube channel

**This is where each channel's identity lives.** Add as many as you like; the point of the
registry is that adding the fourth channel is no harder than the second.

```
channels/<slug>.json          ← identity: name, voice, style, rules, playlists  ← YOU ARE HERE
vox-shorts/IDEAS-<slug>.md    ← that channel's topic bank
vox-shorts/vox-N-<topic>/     ← one video; its beats.json says which channel it belongs to
```

## Adding a channel

1. Copy an existing `channels/*.json`, change `slug` and `name`.
2. **Audition a voice and lock it.** It must differ from every other channel's — a shared
   narrator makes two channels sound like one show. **This is enforced, not trusted:**
   `gen_voice_gemini.py` scans the whole registry on every run and refuses to start if two
   channels declare the same voice.
   ```bash
   python tools/gen_voice_gemini.py --audition "<the hook line of the first video>" \
     --voices Kore,Leda,Aoede,Achernar,Puck,Iapetus
   ```
   Put the winner in `voice`, and a `style` string that **includes a pace lever**
   (`พูดเร็วขึ้นเล็กน้อย`). Voices differ in speed by ~10% and the lever is the only handle
   on it — Gemini has no `duration` parameter.

   > ⚠️ **Audition for TONE. Do not take the RATE from an audition.** `--audition` sends no
   > `style` string, so it measures the voice without the very pace lever you are about to
   > put in the channel file. Charon measured **10.71** Thai characters a second at audition
   > and **12.39** in vox-13, its first real video — a 16% gap, and a script written to the
   > audition figure came out 10:07 against a 7–8 minute brief. Write the script to a
   > placeholder rate, generate the voice, `--retime`, and then **record the measured rate in
   > the channel file** so the second video is planned from a real number. `cosmos` carries
   > that figure in its `voiceNote` and in its last rule.
3. Write `vox-shorts/IDEAS-<slug>.md` with the channel's selection criteria and topic bank.
4. Write the channel's `rules` — the things that are true for THIS channel and not the others.
   The health channel's "every video must land an answer" is a rule; "cite your sources" is
   not, because that one is global and lives in PIPELINE.md.
5. New video → `"channel": "<slug>"` in its beats.json. Nothing else.

## Why a registry instead of putting the voice in each video

Voice and style used to be copied into every `beats.json`. With ten videos per channel that is
ten places to drift, and the drift is silent — you find out when a published video is narrated
in the wrong channel's voice.

Here it is one edit per channel, and the resolution order is explicit:

```
--voice/--style  >  beats.json "voice"/"style"  >  channels/<channel>.json  >  env  >  default
```

Current locks — audition on the real hook line, never from a spec sheet:

| channel | voice | since |
|---|---|---|
| เกษตรที่คนไทยควรรู้ (`agri`) | `Algieba` | 2026-08-04 |
| สุขภาพแบบเข้าใจง่าย (`health`) | `Leda` | 2026-08-04 |
| The EV Insight (`ev`) | `Umbriel` | 2026-08-04 |
| ถอดรหัสจักรวาล (`cosmos`) | `Charon` | 2026-08-19 |

The per-video fields still work as an escape hatch and warn when they contradict the channel.
**An unknown slug is a hard error, not a fallback** — a typo must never quietly resolve to the
default voice.

## Seeing the whole map

```bash
python3 -c "
import json,glob
for f in sorted(glob.glob('channels/*.json')):
    c=json.load(open(f,encoding='utf-8'))
    print(f\"{c['slug']:8s} {c['name'][:30]:32s} voice={c['voice']}  videos={len(c['videos'])}\")"
```

## Visual theme — `"theme"` in the channel file

The collage kit ships two skins, and a channel picks one:

| theme | material | for |
|---|---|---|
| `paper` (default) | aged paper, sepia, ink | documentary, history, anything with an archive |
| `blueprint` | dark technical grid, cyan/amber, light-on-dark | technology, teardowns, systems |
| `cosmos` | night sky: near-black indigo, starlight white, amber/teal | astronomy, physics, anything at the scale of the universe |

**Sepia paper is a claim about time.** On a four-thousand-year-old rice site that is exactly
right; on a brand-new car it reads as ironic. So the EV channel needed a different material —
but not a different engine. Everything that makes the kit work (board camera, parallax,
entrance choreography, chips, leader lines, projected maps, the frame-0 loop) is
material-agnostic; only the palette and background texture carried the "old" signal.

**The third skin cost twelve lines**, which is the number to remember when someone proposes
a new track for a new channel. `COSMOS` in `collage.tsx` is ten colours and a comment; vox-13
reuses the entire vox-12 motion language unchanged on top of it. What made a cosmology channel
feel different was the palette and the voice, not the engine.

`remotion/src/shots/_proof/SkinProofBlueprint.tsx` is the proof and renders in seconds. It uses
the identical components as the rice and water films with `theme="blueprint"` and a grid instead
of paper fibre. **Look at it before arguing about whether a new channel needs a new engine.**

A shot opts in with `<CollageBoard theme="blueprint">`. Adding a third skin is a palette object
in `collage.tsx` — the keys are the contract, the hex values are not.

## What is NOT per channel

Shared by everything, in `PIPELINE.md` / `vox-shorts/DESIGN.md` / `brand.md`: the collage visual
language, the fact-table discipline, "information is real, texture is generated", the QA pass,
frame-0-composed loops, no CTA outros, the Thai typography fixes.

**Do not fork the pipeline per channel.** A channel differs in voice, topic bank, editorial
rules and *skin*. A skin is a palette swap on the same kit — cheap, and `theme` covers it. Only
a genuinely different way of MAKING PIXELS (a video model, live footage) is a new track like
`ai-shorts/`. An earlier version of this file called any visual difference a new track; the
blueprint skin proved that too strict.

## The gap this registry does not close

**A folder name still does not say which channel it belongs to.** `vox-2-thai-rice` and
`vox-3-eight-glasses` look alike in a listing; you have to open `beats.json`. Renaming would
break paths in `media/projects/` and `remotion/src/shots/`, so it was left alone — the `videos`
array in each channel file is the index instead. If this starts costing time, rename at the
next natural break, all at once.
