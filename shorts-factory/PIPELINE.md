# PIPELINE — Thai vox short, topic → published

Dense on purpose: this is read at the start of every video. Rules only, no narrative.
Proven end to end on `vox-shorts/vox-2-thai-rice/` — copy that folder's shape.

**Order matters.** Facts before script, script before layers, QA before render, voice before
retime. Each step's output is the next step's input; skipping one costs a re-render.

**For a video built from scratch, generate the VOICE BEFORE the composition** — steps 7 then 5.
Then every cue is written from a measured window and **step 8 does not run at all**. vox-6 did
this and needed no retime. Keep the documented order only when the composition already exists
and the script is being rewritten under it.

---

## 0. Setup (once per machine)

```bash
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```
Remotion's own Chrome download is blocked here. Full Chrome is rejected too ("Old Headless
mode has been removed") — it must be the **headless shell**.
Keys: `GOOGLE_TTS_API_KEY` (voice + images). ElevenLabs/OpenAI/fal/Replicate are unreachable.

---

## 1. Which channel? → `channels/<slug>.json`

Every video belongs to one. The channel decides the voice, the style string, the topic bank and
the **editorial rules that are not global** — e.g. health requires an answer beat, agriculture
does not. Read the channel file before the fact-finding, because its rules shape what counts as
a usable topic. `channels/README.md` covers adding a new one.

## 2. Facts → `script.md`

Research first, write second. Every claim gets a row: **claim | source URL**.
- Pick a **spine**: one surprising true thing. vox-2's was "same district, 4000 years apart".
  No spine → no video. Do not start building without one.
- Write a **"Deliberately not claimed"** section. What you refuse to say is the channel's asset.
- Health topics: cite reviews/guidelines, not single studies or news write-ups.

### Channel rule example — health must land an ANSWER (`channels/health.json`)

vox-3 shipped without one and the verdict was "เนื้อหาน้อยเกินไป". The spine earns the watch;
the **answer** is what earns the subscribe. A health viewer who reaches the end still not
knowing what to do got half a video.

Structure: hook → story → **ANSWER** → caveat. Budget the answer 8–10s. It is a beat with its
own card, not a sentence tacked onto the last line.

The answer must be:
- **quotable from a guideline or review**, on screen with its source — never synthesised by us
- **stated at population level** ("แนวทางสากลระบุว่า…"), not as a prescription to the viewer
- **specific enough to act on.** "ขึ้นอยู่กับแต่ละคน" is not an answer, it is a refusal to give one

**"No individual medical advice" and "no answer" are different rules.** vox-3 collapsed them
and lost its payoff: EFSA's 2.0/2.5 L total water, the IOM thirst guidance and the hot-climate
note were all already in its fact table, sourced, and went unused. Refusing to prescribe to one
person does not mean refusing to report what the guidelines say.

If the sources genuinely carry no answer, the topic is wrong for this channel — pick another.

## 3. `beats.json`

```json
{"id","title","composition","format":{"width":1080,"height":1920,"fps":30,"durationSec":44},
 "vo":[{"beat","segment","text","start","end","seconds"}], "beats":[{"beat","from","to","camera","layers"}]}
```
`text` = Thai narration. Windows are estimates now; step 6 overwrites them.
6 lines ≈ 40–45s. Under 60s total or it is not a Short.

## 4. Layers

**Information is real, texture is generated. Never swap.**

| Kind | How |
|---|---|
| maps, charts, routes, timelines | drawn in TSX from the fact table (`lib/map.tsx`, Natural Earth) |
| people, objects, atmosphere | `tools/gen_image.py --model pro` → `tools/cutout.py` (rembg) |
| paper, grain, chips, stamps | `lib/collage.tsx` |

**No generated image may be presented as a document.** No AI image inside `ArchivalPhoto`
with a factual caption. Say "a farmer", never "the farmer". vox-1 broke this; don't copy it.
Committed to `media/projects/<proj>/layers/`.

**No generated image may be presented as a real company's product either.** A video about a
named manufacturer gets generic hardware for atmosphere; every claim about that company lives
on a typeset card with its source.

**"Do not resemble any real brand" does not work as a prompt.** vox-5 asked for a generic EV
with no badges and got a Model Y in all but name, because "modern EV crossover" IS a Model Y in
the training data. Specify a genuinely different FORM — vox-5's second attempt asked for a
small orange city hatchback on steel wheels and escaped. The failed one is kept beside it as
`car-modelY-lookalike.png`. **Look at what came back; the prompt's intent is not evidence.**

## 5. Composition — `remotion/src/shots/vox-N/`

`CollageBoard cam={CAM}` + `Sequence` per beat + a `CUE` table of global frames.
Thai shot → add `fontBody={FONT_TH} fontDisplay={FONT_TH_DISPLAY} tracking="0.6px"`.
Hook cues negative so **frame 0 is fully composed** (it is the thumbnail).
Last frame ≈ frame 0 so the loop closes. No CTA outro.
`cd remotion && npm run gen` after adding a shot.

## 6. QA — not optional

```bash
node scripts/frames.mjs Vox2ThaiRice 0,240,400,560,700,900,1060,1200,1319 --scale=0.42
```
**Read every PNG.** Check: text cropped at max zoom? chips attached to what they label? two
claims contradicting on one frame? anything invisible at phone scale? frame 0 composed?
This pass caught 6 real defects in vox-2, 2 in the Thai conversion and 5 in vox-6.

Two of vox-6's are general enough to check for every time:

- **Left margin and peak camera zoom are ONE decision.** A chip at x=110 is safe at z=1 and
  30px from the frame edge at z=1.18, because zooming moves the board's visible left edge in to
  x≈85. Put the margin in a named constant next to the CAM table, not in six call sites.
- **A long line with a short picture reads as a stall.** Sort the beats by VO seconds and look
  at the longest one first: vox-6's 10.16s line was a single card on an empty grid. Over ~8s a
  card needs a diagram under it, and the diagram is usually the argument already in the script.

For a video over 60s, also check the tail: composition length must be **last word + ~4s**, not
a round number. vox-6 was first cut at 117s against a 108.4s script and the 8.6s of silence
read as the video ending twice. `durationSec` in beats.json must match — that is what pads the
audio bed, and a mismatch either trims the picture or leaves the audio hanging past it.

## 7. Voice

**The voice belongs to the CHANNEL — see `channels/README.md`.** A video says
`"channel": "health"` in its beats.json and the voice, style and editorial rules come from
`channels/health.json`. Nothing about the voice is typed on the command line, and an unknown
slug is a hard error rather than a fallback, and two channels declaring the same voice is
refused outright — the rule is checked on every run, not remembered. Audition with the shot's
real hook line, never from a spec sheet.

`agri`=Algieba · `health`=Leda · `ev`=Umbriel. Voices differ in PACE by ~10%, so every channel
`style` needs a pace lever (`พูดเร็วขึ้นเล็กน้อย`) and the composition length follows the voice.

**Voices differ in PACE, not just timbre — budget for it.** Same trimmed script, same style
prompt: Algieba 45.86s, Leda 50.42s (+10%). Include the pace lever (`พูดเร็วขึ้นเล็กน้อย`) in
every channel's style string; without it Leda ran 53.30s. When a locked voice overruns, grow the
composition — up to the 60s ceiling — rather than cutting the script a second time.

```bash
python tools/gen_voice_gemini.py --beats <beats.json> --voice Algieba --retime \
  --style "อ่านแบบผู้บรรยายสารคดี น้ำเสียงหนักแน่นจริงจัง จังหวะกระชับ พูดเร็วขึ้นเล็กน้อย ไม่ลากเสียง ไม่เว้นวรรคนาน"
```
- **No `duration` param.** `--style` is the only pace handle; it is interpreted, not spoken
  (faster −2.9s, slower +6.0s on a 10.9s line). Bare Algieba runs ~25% long — keep the style.
- **Verify the numbers**: send the wav back to Gemini and read the transcript. Normalisation
  is per-utterance — `ค.ศ. 1945` came out digit-by-digit while `ค.ศ. 1959` was fine. Fix with
  a `say` field on that vo entry; `text` stays readable.
- Bed is auto-normalised to −14 LUFS / −1.5 dBTP (raw output clips at +0.6 dBTP).
- New voice? `--audition "<hook line>" --voices A,B,C` and listen. Never pick from a spec sheet.

## 8. Retime — mechanically, never by eye

VO lengths changed → remap **every** cue and camera keyframe through a piecewise-linear map
built from old→new line boundaries (`vox-2` script: 18 cues, 11 keyframes, largest move 26f).
A cue that sat on a phrase then still sits on it. Update the `CUE` comments to match.
Note: each Gemini clip has ~0.3s leading silence, so speech lands ~0.3s after its cue —
picture leads voice, which is correct. Don't chase it.

## 9. Render + mux

```bash
node scripts/render-all.mjs <CompId> --scale=1
python tools/gen_voice_gemini.py --beats <beats.json> --voice Algieba --style "…" \
  --mux remotion/out/<CompId>.mp4
ffmpeg -i out/<CompId>-voiced.mp4 -c:v libx264 -crf 26 -maxrate 3500k -bufsize 7000k \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart -y deliver.mp4   # <30MB for chat
```
Verify both streams are the full duration. (`-shortest` + an unpadded bed silently trimmed
the picture to the voice and ate the loop; fixed, but check.)

## 10. Publish kit → `publish.th.md`

Title (1 recommended + alternates, ≤40 chars so mobile doesn't truncate) · description
(long + short, keyword in line 1, sources listed) · ~24 tags **specific→broad** (≤500 chars) ·
3 on-page hashtags · playlists. Carry forward what the video refuses to claim.

## 11. Cover → `covers.th.md`

`gemini-3-pro-image` **renders Thai correctly** — put the words in the prompt. Required in
every cover prompt: explicit margins (8% sides / 6% top-bottom), one number 3–4× the other
type, `perfectly spelled`, `no gradient / no glow`, named colours not "vivid", Thai headline
on **one line** (a model wrapping Thai breaks it mid-word). `--model pro` only.

---

## Thai gotchas (all fixed in the kit — do not re-fix, do not regress)

| Symptom | Cause |
|---|---|
| chips drift left | `text.length` counts zero-width vowels/tones; est. now strips them |
| statement split mid-word | `SerifStatement` chunks are separate boxes — chunk on real word boundaries |
| kicker too airy | latin 2.2px tracking; Thai wants 0.6px |
| label overflows column | Thai runs longer — move units into headers, don't widen columns |
| Thai renders in a system font | needs a Thai family in the stack; `FONT_TH` = Kanit (latin+thai subsets, needs `unicode-range`) |

**Fonts never load over the network.** `fetch-fonts.mjs` inlines woff2 as data URIs into a
synchronous `<style>`. Never reintroduce `FontFace.load()` — its promise never settles in
renderMedia's backgrounded tabs and the render hangs with no error.

## Where things live

`vox-shorts/vox-N-<topic>/` → script.md · beats.json · publish.th.md · covers.th.md
`remotion/src/shots/vox-N/` → the TSX · `media/projects/vox-N-<topic>/` → layers, covers
`voice/` and `remotion/out/` are gitignored (regenerable).
