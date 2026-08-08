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
`gen_image.py` looks for **`GEMINI_API_KEY`**, which the environment does not set — export it
from the TTS key for the call (`export GEMINI_API_KEY="$GOOGLE_TTS_API_KEY"`). Never write it
to a file; `.env` is gitignored but the repo is public and a key in a command is a key on disk
the moment someone redirects it.

**Web research: search works, fetching sources does not.** The proxy refuses CONNECT (403) to
`who.int`, `iris.who.int`, `thelancet.com`, `pmc.ncbi.nlm.nih.gov`, `europepmc.org`,
`jamanetwork.com`, `bmj.com`, `cochranelibrary.com`, `clinicaltrials.gov`, `nia.nih.gov`,
`alz.org` and `georgeinstitute.org` — every medical primary source tried so far. Do not route
around it. For the health channel, whose first rule is "cite guidelines, not news", this is a
standing constraint: either get the PDFs from the operator, or **triangulate** — re-search with
different query wording and record in `script.md` how many independent result sets each figure
appeared in. It is weaker than reading the paper and must be labelled as such. It also works:
vox-7's spine was wrong in the idea file and the second search caught it.

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

### Channel rule example — health must land an ANSWER **and a SUMMARY** (`channels/health.json`)

vox-3 shipped without an answer and the verdict was "เนื้อหาน้อยเกินไป". vox-7 had the answer
and still drew the same note — because an answer buried in the middle is not a summary. The
spine earns the watch; the **answer** earns the subscribe; the **summary** is what the viewer
screenshots and sends to their mother.

Structure: hook → story → mechanism → **ANSWER** → caveat → **SUMMARY**. Budget the answer
8–10s and the summary 20–25s. Both are beats with their own cards, never a sentence tacked onto
the last line.

**The summary must answer three things separately, visible on screen at once:**

| | |
|---|---|
| **ปัญหา** | what is actually wrong, in one sentence |
| **ทางแก้** | the one thing that changes it |
| **คำแนะนำ** | the guideline's own list, as a list |

Write it so a screenshot of that card is useful on its own, with no video around it. That is
how health content travels.

**Length is NOT a constraint on this channel** (operator, 2026-08-07): *"เรื่องสุขภาพมันสำคัญ
ที่จะต้องพูดให้กระจ่าง ให้คนเข้าใจ"*. Going over 60s costs Shorts distribution and that trade
is accepted here — a viewer who understands beats a viewer who scrolled past. Do not cut the
summary to stay under the ceiling; cut the ceiling.

**Hunt for the guideline's NEGATIVE recommendations too.** What it says *not* to do is as
actionable as what it says to do, it saves the viewer money, and it is the least-covered part
of any guideline. WHO's 2026 dementia edition says vitamin B, vitamin E, omega-3 and
multivitamins should not be used for dementia prevention without a diagnosed deficiency —
worth a beat of its own in a market full of supplement advertising.

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
6 lines ≈ 40–45s.

### ⬛ ORIENTATION IS DECIDED BY LENGTH, AND IT IS DECIDED HERE

| Length | Format | Why |
|---|---|---|
| **under 60s** | **1080×1920 vertical** | it is a Short; the feed is vertical |
| **over 60s** | **1920×1080 landscape** | it is an ordinary YouTube video, watched on a wide player |

vox-8 was built at 1080×1920 and ran nine and a half minutes. The vertical format was
inherited from the Shorts pipeline and never re-examined when the length changed, so a
long-form documentary shipped in the shape of a Short. **When `durationSec` goes past 60,
`width` and `height` swap. Check it in this step, not after the render.**

Landscape is not a worse canvas, it is a different one, and mostly a better one for a long
video: text on the left and picture on the right sit side by side instead of stacking, which
also makes the band-collision bug in step 6 nearly impossible. Wide diagrams — cross-sections,
timelines, bar charts — get room they never had vertically.

**Generate the layer images to match.** A 1:1 or 9:16 photo dropped into a 16:9 slot is mostly
crop. For a landscape video ask `gen_image.py` for `--aspect 16:9` on anything that fills a
scene, and keep 1:1 only for cutouts that sit on the board as objects.

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

**The same trap catches PLACES.** vox-7 asked for "mid-rise apartment blocks in haze" for a
line about the dust Thai viewers breathe, and got unmistakable Soviet-era panel blocks —
because that is what the words mean statistically. Under Thai narration it would have asserted
a location the video has no source for. Fixed by removing the architecture entirely: flat
silhouettes, no windows, no features, recognisable as nowhere. Reject kept as
`haze-sovietblocks-reject.png`. When a shot only needs atmosphere, generate atmosphere — every
identifiable detail is a claim you did not intend to make. Caption it as an illustration too.

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

**In a long scene, two things wanting the same vertical band must take turns.** A `Sequence`
with no `durationInFrames` never leaves, so the later element draws straight over the earlier
one and both become unreadable. vox-8 shipped this three times in one pass — a chart over a
photo, a pH curve over a photo, a tool over a hand — because its scenes run 30-50s and hold
many elements. Give the first one `durationInFrames={<next cue> - <this cue> - 18}`. The 18 is
the fade. Short videos hide this bug; anything past about 20s per scene will not.

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

**Estimate line length from the MEASURED rate, never by eye.** Leda **14.0** Thai characters
per second, Algieba **14.5**, spaces included, counted on the `say` field. vox-7's first pass
was eyeballed and ran 75.18s against a 52s budget — 30% out, three lines' worth. Count
characters before generating; the check costs nothing and a re-generation costs a full API pass.

**Do not derive one voice's rate from another's clip length.** Algieba was assumed 10% faster
than Leda because an old pair of finished videos differed by that much; measured across vox-8's
61 lines it is 3%. Clip lengths differ by content and pausing, not just by voice. Measure each
voice once on real work and write the number in `beats.json`'s `paceNote`.

Two things the rate does not capture, so leave headroom: spelled-out numbers inflate the `say`
field well past the `text` it replaces, and a line with three clauses pauses between them (one
vox-7 line came in 2.4s over its character count, and it was the one with three clauses).
Under 60s is a hard gate — a Short that measures 60.06s is not a Short.

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

### ⬛ The daily TTS quota is a planning constraint, not an error to retry through

**100 requests per day per model.** One line = one request, so a video's line count IS its
quota cost, and the number is knowable before you generate anything. vox-9 (32 remaining) plus
vox-10 (67) came to 99 of 100 — arithmetically possible, and still the wrong plan, because it
leaves no room for a single retry. **Finish one video per reset day.** Count the lines against
what the day has left before starting, and if two videos are waiting, say which goes first.

**A lucky `--audition` does not mean the quota reset.** Measured 2026-08-08: one audition got
through the retry ladder and looked like proof the window had reopened; the real 67-line run
died on `RESOURCE_EXHAUSTED` a minute later. The retry ladder can walk a *single* call through
a gap that a sustained run cannot use. **Test with the real job, not with a probe.**

Exhausted looks like `HTTP 429` → backoff → `RESOURCE_EXHAUSTED` with a
`"check your plan and billing"` message. That is a wall, not the transient 429 the ladder is
for, and hammering it wastes nothing but time.

**The reset is MIDNIGHT PACIFIC, not 24h after you hit the wall.** Often it is only a few
hours out. Check the clock before writing off a day — `TZ=America/Los_Angeles date`.

### ⬛ More API keys is usually NOT more quota

Both tools take `GEMINI_API_KEY_2`..`_9` and rotate when a key is fully spent (not
round-robin — draining one and moving on is the only behaviour that gains anything).

**But Gemini's limits are enforced per Google Cloud PROJECT, not per key.** Keys minted in
one project share one pool, so key 2 hits the wall key 1 just hit, instantly. Adding keys
from the same project is the intuitive move and it does nothing at all.

What works, best first:

1. **Enable billing on the project.** The paid tier raises the daily cap by orders of
   magnitude and deletes this whole class of problem. For a pipeline shipping videos, this is
   the real answer and everything below is a workaround.
2. **Separate Google Cloud projects** under the same account — legitimate, genuinely separate
   quota, one key each.
3. **Wait for midnight Pacific.**

Separate *accounts* created to multiply free quota is a different thing from separate
projects and is the kind of thing provider terms tend to prohibit. Not a route to take.

**Image and TTS quotas are separate**, which is why layers and covers kept working on the day
vox-10's voice was blocked.

**Never swap TTS models to dodge it.** Measured: `gemini-2.5-flash-preview-tts` reads ~23%
faster (17.5 vs 14.17 ch/s), which silently rewrites the video's length. And two engines inside
one video is worse than waiting — if you switch, you re-generate *every* line, not the rest.

### ⬛ When voice is blocked, the video is not

Voice-first (above) says the composition waits for measured windows. It does **not** say the
whole video waits. Everything before §5 is independently doable and is most of the work:
research and `script.md`, `beats.json` with windows estimated from the measured rate, layers,
cover, and the publish kit. The image API is a **separate quota** and is usually still up.

Mark every `vo` entry `"timing": "estimated"` and put the reason in `voiceStatus`, so the next
session knows at a glance that the numbers are provisional and the composition is deliberately
absent rather than forgotten.

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

Title (see below) · description (long + short, keyword in line 1, sources listed) · ~24 tags
**specific→broad** (≤500 chars) · 3 on-page hashtags · playlists. Carry forward what the video
refuses to claim.

### ⬛ The title is not one line — it is three patterns, and they trade against each other

Hook and SEO pull in opposite directions. Don't average them into one mediocre title; write
**three**, each winning a different surface, and say which to default to and when to switch:

| | pattern | wins | loses |
|---|---|---|---|
| 🅰️ | **keyword-first** — search token in the first 2 words, hook after | search | looks like an article; weak in-feed |
| 🅱️ | **improbable number** — one concrete figure too small to matter | browse / suggested / thumbnail pairing | nobody types that number |
| 🅲 | **the query as typed** — mirror a real question, answer it in the same line | long-tail + voice | can promise a side-topic the video only touches |

**Long video → default 🅱️.** A 9-minute video does not grow on search; it grows on being
suggested. **Short → default 🅰️ or 🅲**, where search actually feeds the Short. Then check the
traffic mix at 48h and switch — **the title is editable forever, the thumbnail is not.**

### ⬛ The title must not repeat the thumbnail

vox-8 shipped `ปุ๋ยที่หว่านลงนา หายไปไหน — ต้นข้าวได้กินแค่ 38%` against a thumbnail already
reading **ปุ๋ยหายไปไหน** and **38% → 85%**. Both slots said the same thing — two pieces of
real estate carrying one piece of information.

They are one unit: **thumbnail asks, title escalates.** vox-8's fix pairs the thumbnail's `38%`
with a title saying `หายไป 62%` (same number, other side) or pairs the thumbnail's `7 ซม.`
label with a title built on `ลึก 7 เซนติเมตร`. Write the title *after* the cover exists, and
read them side by side before choosing.

### ⬛ Find the keyword by search, not by intuition — you will guess the wrong word

Search works even though fetching doesn't (§0), and one round of queries is enough to be
worth more than any amount of guessing. vox-8's round, in four searches:

- **Thai farmers do not search "ยูเรีย" — they search `46-0-0`.** Shops, extension services
  and every ag site name fertiliser by its formula. The original kit had the wrong word.
- **`ปุ๋ยสั่งตัด` had a national news cycle running** — and the video's own last recommendation
  is that principle under a different name.
- **`ใส่ปุ๋ยข้าวตอนไหน` is an article headline on a major ag site** — headlines are proof a
  query repeats often enough to be worth answering.
- A Thai government extension page **already taught the video's core mechanism** (alkaline soil
  → avoid 46-0-0 → nitrogen volatilises), which both corroborates the content and positions the
  video as "the half of this you were never told".

Record the queries and what each word bought in the kit, with the §0 caveat that titles came
from result listings, not from pages actually read. **A keyword is fine to take from a search
summary; a fact is not.**

**A keyword you can't deliver on stays out of the title.** `ปุ๋ยสั่งตัด` had the volume and was
still refused — the video doesn't teach it. Tags and description, never the title.

**Measure the length, don't eyeball it** — Thai combining marks `[ัิ-ฺ็-๎]` are zero-width, so
`len()` overcounts by ~20% and rejects titles that fit. Strip them, then apply the ≤40 rule.

## 11. Cover → `covers.th.md`

`gemini-3-pro-image` **renders Thai correctly** — put the words in the prompt. Required in
every cover prompt: explicit margins (8% sides / 6% top-bottom), one number 3–4× the other
type, `perfectly spelled`, `no gradient / no glow`, named colours not "vivid", Thai headline
on **one line** (a model wrapping Thai breaks it mid-word). `--model pro` only.

**Aspect follows §3.** Long video → `--aspect 16:9`. Short → `--aspect 9:16`. The cover and
the video are the same shape or the thumbnail gets letterboxed in the feed.

### ⬛ The model's PNG is too big to upload, every time

**YouTube's thumbnail limit is 2 MB. `--model pro` returns 2K, and a 2K PNG is over it** —
vox-8's was 2752×1536 / **2.27 MB**, rejected before it ever reached the form. The output is
also not exactly 16:9 (2752/1536 = 1.792), so resizing alone squashes it.

So always produce an upload copy beside the original — crop to exact aspect, then resize, then
JPEG:

```python
im = Image.open(src); w, h = im.size
tw = int(round(h * 16 / 9)); x = (w - tw) // 2
im.crop((x, 0, x + tw, h)).resize((1920, 1080), Image.LANCZOS) \
  .save(dst, 'JPEG', quality=92, optimize=True, progressive=True)   # ~0.2 MB
```

Name it `<cover>-upload.jpg` and point the publish kit at **that** file, not the PNG.
Keep the PNG — it is the evidence, and it is what you measure on.

**Measure the cover with code, not eyes** (§6's rule, applied to the still). vox-7 measured two
bars at 614px == 614px; vox-8 measured `85%` at 307px against `38%` at 191px = 1.61×. Then
downscale to **320px wide** and *look at it* — that is the real size in a phone feed, and it is
the only check that catches Thai that is technically correct and practically unreadable.

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
