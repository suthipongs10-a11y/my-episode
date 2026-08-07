#!/usr/bin/env python3
"""
gen_voice_gemini.py — voice track from Google's Gemini TTS, driven by the same beats.json as
gen_voice.py and gen_voice_local.py.

Third sibling. The other two need something we do not have:

  gen_voice.py        ElevenLabs. api.elevenlabs.io is not reachable from this environment
                      (proxy CONNECT refused, HTTP 000) and there is no key.
  gen_voice_local.py  a TTS server YOU run. Works, and it is what produced the first vox-2
                      VO — but a GPU pod bills by the wall-clock hour whether it is speaking
                      or idle, so the machine has to be babysat up and down around each job.

This one is usage-billed and always up. generativelanguage.googleapis.com is reachable and
GOOGLE_TTS_API_KEY authenticates against it. Ten TTS providers were probed; it is the only
one that answered. That is the whole reason this file exists — not a preference.

WHAT IT CAN AND CANNOT DO

  ✅ vox shorts. No burned captions, so per-LINE audio and honest line timings are all they
     need. Drop-in.
  ❌ per-word caption tracks. Gemini returns audio, not timestamps. Same recovery path as
     gen_voice_local.py: forced alignment afterwards, plus a Thai word segmenter (pythainlp
     newmm) before alignment, because Thai script has no spaces and "per word" is undefined
     until something segments it.

THERE IS NO `duration` PARAMETER, AND THAT MATTERS

  OmniVoice's generate() takes a target length and hits it, which is why gen_voice_local.py
  has --fit-window. Gemini has no such field, so this tool cannot make a line fit a window.

  What it CAN do is ask for a pace, because Gemini interprets an instruction in the prompt
  rather than reading it aloud. Measured here, same voice, same Thai line, 2026-08-04:

      bare                        10.88s
      "พูดเร็วขึ้น" prefix          7.96s   (-2.92s)
      "พูดช้าลง" prefix           16.88s   (+6.00s)
      tone-only, no pace          11.80s   (+0.92s)

  So --style steers length, coarsely and not repeatably to the frame. The reliable order of
  operations is still: generate, measure, then move the picture (--retime). Do not chase a
  target duration by re-rolling the same line with stronger adjectives.

  (An earlier probe here concluded the opposite — that the instruction gets SPOKEN. That test
  was confounded: it asked for a slow, warm read, so the audio got longer and the wrong cause
  was blamed. The controlled version above is what stands.)

A `say` FIELD, FOR WHEN THE ENGINE READS A NUMBER WRONG

  Gemini normalises Thai numerals well but not reliably. Measured on this script: `199`,
  `105`, `1959`, `31` and `2000` all came out as proper Thai number words, while `ค.ศ. 1945`
  in one line came out "คอ สอ หนึ่ง เก้า สี่ ห้า" — digit by digit — even though `ค.ศ. 1959`
  two lines later was read correctly. It is per-utterance, so there is nothing to configure
  around it.

  So a vo entry may carry an optional `say`, which is what gets spoken; `text` stays the
  human-readable script. Only add one where a read was heard to be wrong — a blanket
  pre-spelling of every number would hide the engine getting it right.

  Hearing it is the point. Do not assume the numbers were fine: synthesise, then transcribe
  the audio back (Gemini takes audio input) and read what it actually said.

CONFIGURATION — environment, nothing hardcoded (CLAUDE.md §2.1)

  GOOGLE_TTS_API_KEY   required. Also accepts GEMINI_API_KEY.
  GEMINI_TTS_MODEL     [default: gemini-3.1-flash-tts-preview]
                       also valid: gemini-2.5-pro-preview-tts, gemini-2.5-flash-preview-tts
  GEMINI_TTS_VOICE     prebuilt voice name        [default: Algieba]
  GEMINI_TTS_STYLE     style/pace instruction prepended to every line   [default: unset]

THE VOICE BELONGS TO THE CHANNEL, NOT TO THE VIDEO OR THE COMMAND LINE

  A channel has ONE narrator and two channels must not share one, or they sound like the same
  show. So the voice is stored once per channel in channels/<slug>.json, and a video only says
  which channel it belongs to:

    beats.json:            "channel": "health"
    channels/health.json:  "voice": "Leda", "style": "อ่านแบบผู้บรรยายสารคดีสุขภาพ ..."

  Storing it per channel rather than per video is the point. Copied into ten beats.json files
  it is ten places to drift; in the registry, changing a channel's voice is one edit and every
  future render follows.

  Precedence, highest first:
    --voice/--style  >  beats.json "voice"/"style"  >  channels/<channel>.json  >  env  >  default

  The per-video fields still work as an escape hatch, and disagreeing with the channel prints a
  warning rather than passing silently. An unknown channel slug is a hard error — a typo must
  not fall through to the default voice and quietly narrate a health video in the farming one.

Usage:
  python tools/gen_voice_gemini.py --beats vox-shorts/vox-2-thai-rice/beats.json --dry-run
  python tools/gen_voice_gemini.py --beats ... --voice Algieba
  python tools/gen_voice_gemini.py --beats ... --retime          # windows follow the audio
  python tools/gen_voice_gemini.py --beats ... --mux remotion/out/Vox2ThaiRice.mp4
  python tools/gen_voice_gemini.py --audition "ทดสอบเสียง" --voices Algieba,Charon,Orus

Lines are cached by (voice, model, style, text): rewriting one line regenerates that line
only. ffmpeg/ffprobe on PATH. Stdlib only, like the rest of tools/.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_VOICE = "Algieba"


def load_env():
    env = {}
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return {**env, **os.environ}


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=noprint_wrappers=1:nokey=1", path]).stdout
    return float(out.strip())


def synth(cfg, text, out_path):
    """One line -> one wav.

    Gemini hands back raw signed 16-bit little-endian PCM as base64, with the sample rate in
    the mimeType (audio/L16;codec=pcm;rate=24000) and no container. We parse the rate rather
    than assuming 24k, and write the RIFF header ourselves — that is all `wave` is doing here.
    """
    prompt = f"{cfg['style']}\n\n{text}" if cfg.get("style") else text
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": cfg["voice"]}}
            },
        },
    }, ensure_ascii=False).encode("utf-8")

    url = API.format(model=cfg["model"]) + "?key=" + cfg["key"]
    # The preview TTS models rate-limit readily and a 6-line job trips it, so back off rather
    # than failing a run halfway and leaving a half-cached voice directory behind.
    for attempt in range(5):
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"},
                                     method="POST")
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                payload = json.load(r)
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:600]
            if e.code in (429, 500, 503) and attempt < 4:
                wait = 2 ** attempt * 5
                print(f"      HTTP {e.code}, retrying in {wait}s")
                time.sleep(wait)
                continue
            sys.exit(f"Gemini returned {e.code} for {text[:40]!r}\n{detail}")
        except Exception as e:
            sys.exit(f"Gemini unreachable: {type(e).__name__}: {e}")
    else:
        sys.exit("Gemini kept rate-limiting after 5 attempts")

    try:
        inline = payload["candidates"][0]["content"]["parts"][0]["inlineData"]
    except (KeyError, IndexError):
        sys.exit(f"No audio in the response for {text[:40]!r}:\n"
                 f"{json.dumps(payload, ensure_ascii=False)[:800]}")

    pcm = base64.b64decode(inline["data"])
    m = re.search(r"rate=(\d+)", inline.get("mimeType", ""))
    rate = int(m.group(1)) if m else 24000
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def load_channel(slug):
    """The channel registry. A typo in the slug is fatal on purpose: silently falling back to
    the default voice would narrate one channel's video in another channel's voice, which is
    the exact failure this registry exists to prevent."""
    cdir = os.path.join(ROOT, "channels")
    # Two channels sharing a narrator is the failure this registry exists to stop, so it is
    # CHECKED rather than remembered — and checked on every run, not only when adding a channel.
    if os.path.isdir(cdir):
        seen = {}
        for f in sorted(os.listdir(cdir)):
            if not f.endswith(".json"):
                continue
            try:
                c = json.load(open(os.path.join(cdir, f), encoding="utf-8"))
            except ValueError:
                sys.exit(f"channels/{f} is not valid JSON")
            v = c.get("voice")
            if v and v in seen:
                sys.exit(f"channels/{f} and channels/{seen[v]}.json both use the voice {v!r} — "
                         f"one voice per channel, or the channels sound like one show")
            if v:
                seen[v] = c.get("slug", f[:-5])
    if not slug:
        return {}
    path = os.path.join(cdir, f"{slug}.json")
    if not os.path.exists(path):
        have = sorted(f[:-5] for f in os.listdir(cdir) if f.endswith(".json")) if os.path.isdir(cdir) else []
        sys.exit(f"unknown channel {slug!r} — channels/ has: {', '.join(have) or '(none)'}")
    return json.load(open(path, encoding="utf-8"))


def audition(cfg, text, voices, outdir):
    """Same line in several voices, side by side. Choosing a voice from a spec sheet does not
    work; choosing it from six mp3s of the actual script does."""
    os.makedirs(outdir, exist_ok=True)
    for v in voices:
        path = os.path.join(outdir, f"{v}.wav")
        synth({**cfg, "voice": v}, text, path)
        mp3 = path.replace(".wav", ".mp3")
        run(["ffmpeg", "-v", "error", "-i", path, "-b:a", "128k", "-y", mp3])
        print(f"  {v:14s} {duration(path):5.2f}s  -> {os.path.relpath(mp3, ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats", help="path to the video's beats.json")
    ap.add_argument("--audition", metavar="TEXT",
                    help="synthesise one line in several voices and stop (no beats.json needed)")
    ap.add_argument("--voices", help="comma-separated voice names for --audition")
    ap.add_argument("--outdir", help="where --audition writes [scratch next to this tool]")
    ap.add_argument("--voice", help="override GEMINI_TTS_VOICE")
    ap.add_argument("--model", help="override GEMINI_TTS_MODEL")
    ap.add_argument("--style", help="pace/tone instruction prepended to every line; see the "
                                    "docstring for what this does and does not control")
    ap.add_argument("--retime", action="store_true",
                    help="rewrite beats.json start/end from the REAL audio durations, packed "
                         "in order with --gap between lines")
    ap.add_argument("--gap", type=float, default=0.6, help="seconds between lines when --retime [0.6]")
    ap.add_argument("--force", action="store_true", help="regenerate every line, ignoring the cache")
    ap.add_argument("--lufs", type=float, default=-14,
                    help="integrated loudness target for the bed [-14, the social convention]")
    ap.add_argument("--no-normalize", action="store_true",
                    help="ship the bed at Gemini's own level. It clips (+0.6 dBTP measured) — "
                         "only use this if something downstream owns the loudness pass.")
    ap.add_argument("--mux", help="rendered mp4 to mux the voice onto (writes -voiced.mp4)")
    ap.add_argument("--dry-run", action="store_true", help="plan only; contact nothing")
    args = ap.parse_args()

    env = load_env()
    # beats.json is read before cfg is built so the project's locked voice can take part in the
    # precedence chain; --audition has no beats file, hence the guard.
    locked = {}
    if args.beats and os.path.exists(args.beats):
        try:
            locked = json.load(open(args.beats, encoding="utf-8"))
        except (ValueError, OSError):
            locked = {}
    chan = load_channel(locked.get("channel"))
    cfg = {
        "key": env.get("GOOGLE_TTS_API_KEY") or env.get("GEMINI_API_KEY"),
        "model": args.model or locked.get("model") or env.get("GEMINI_TTS_MODEL", DEFAULT_MODEL),
        "voice": (args.voice or locked.get("voice") or chan.get("voice")
                  or env.get("GEMINI_TTS_VOICE", DEFAULT_VOICE)),
        "style": args.style or locked.get("style") or chan.get("style") or env.get("GEMINI_TTS_STYLE"),
    }
    if not cfg["key"] and not args.dry_run:
        sys.exit("GOOGLE_TTS_API_KEY (or GEMINI_API_KEY) is not set in env or .env")

    if args.audition:
        voices = [v.strip() for v in (args.voices or DEFAULT_VOICE).split(",") if v.strip()]
        outdir = args.outdir or os.path.join(ROOT, "tools", ".audition")
        print(f"audition: {len(voices)} voices, model={cfg['model']}")
        audition(cfg, args.audition, voices, outdir)
        return
    if not args.beats:
        sys.exit("--beats is required (or use --audition)")

    beats_path = os.path.abspath(args.beats)
    beats = json.load(open(beats_path, encoding="utf-8"))
    vo = beats["vo"]
    proj = os.path.dirname(beats_path)
    vdir = os.path.join(proj, "voice")
    os.makedirs(vdir, exist_ok=True)

    src = ("--voice" if args.voice else "beats.json" if beats.get("voice")
           else f"channels/{chan['slug']}.json" if chan.get("voice") else "env/default")
    print(f"{beats['id']}: {len(vo)} lines -> {os.path.relpath(vdir, ROOT)}")
    if chan:
        print(f"  channel: {chan['name']} ({chan['slug']})")
    print(f"  model={cfg['model']}  voice={cfg['voice']} ({src})")
    print(f"  style={(cfg['style'] or '-')[:80]}\n")
    locked_voice = beats.get("voice") or chan.get("voice")
    if args.voice and locked_voice and args.voice != locked_voice:
        print(f"  !! --voice {args.voice} OVERRIDES the locked voice ({locked_voice}). "
              f"A channel's videos are meant to share one narrator.\n")

    clips = []
    for i, line in enumerate(vo):
        # `say` overrides what is spoken without touching the readable script (see docstring).
        text = line.get("say") or line["text"]
        # The cache key carries the voice, model and style, not just the text — otherwise
        # switching voices silently reuses the old voice's audio.
        key = f"{cfg['model']}|{cfg['voice']}|{cfg['style'] or ''}|{text}"
        h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]
        out = os.path.join(vdir, f"line-{i:02d}-{h}.wav")
        cached = os.path.exists(out) and not args.force
        if args.dry_run:
            print(f"  [{i}] {'cached' if cached else 'would generate'}: {text[:64]}…"
                  f"{'  (say override)' if line.get('say') else ''}")
            continue
        if not cached:
            synth(cfg, text, out)
        d = duration(out)
        clips.append({"path": out, "dur": d, "line": line})
        est = line["end"] - line["start"]
        drift = d - est
        flag = "  <-- OVERFLOWS its window" if drift > 0.25 and not args.retime else ""
        print(f"  [{i}] {d:5.2f}s  (window {est:5.2f}s, drift {drift:+.2f}s){flag}")

    if args.dry_run:
        print("\ndry run: nothing contacted, nothing written")
        return

    if args.retime:
        t = vo[0]["start"]
        for c in clips:
            c["at"] = round(t, 3)
            c["line"]["start"] = round(t, 3)
            c["line"]["end"] = round(t + c["dur"], 3)
            c["line"]["seconds"] = round(c["dur"], 3)
            t += c["dur"] + args.gap
        print(f"\nretimed: VO now ends at {t - args.gap:.2f}s")
    else:
        for c in clips:
            c["at"] = c["line"]["start"]

    total = max(c["at"] + c["dur"] for c in clips)
    dur_target = beats.get("format", {}).get("durationSec", total)
    voice_wav = os.path.join(vdir, "voice.wav")

    inputs, filters, labels = [], [], []
    for i, c in enumerate(clips):
        inputs += ["-i", c["path"]]
        filters.append(f"[{i}:a]aresample=48000,adelay={int(c['at'] * 1000)}|{int(c['at'] * 1000)}[a{i}]")
        labels.append(f"[a{i}]")
    # apad, then -t, and both are load-bearing. amix ends when its longest input ends, and -t
    # only truncates — it cannot extend. Without the pad the bed is as long as the VO (41.1s
    # here) rather than as long as the composition (44s), and then -shortest at mux time
    # trims the PICTURE to the voice: the loop back to frame 0 gets cut off and the video
    # quietly ends three seconds early. Pad first, then clamp.
    filters.append(f"{''.join(labels)}amix=inputs={len(clips)}:normalize=0:dropout_transition=0,apad[out]")
    run(["ffmpeg", "-v", "error", *inputs, "-filter_complex", ";".join(filters),
         "-map", "[out]", "-t", str(max(total, dur_target)), "-ar", "48000", "-ac", "1",
         "-y", voice_wav])

    # Gemini hands back audio hot: measured on this script, -15.1 LUFS integrated but +0.6
    # dBTP — i.e. already over full scale before anything is mixed on top of it. Left alone
    # that clips on playback, and it clips worse once SFX and a music bed arrive. So the bed
    # is normalised to the social-video convention (-14 LUFS) with real headroom under the
    # ceiling. Not cosmetic: it is the difference between a VO that survives a mix and one
    # that distorts.
    if not args.no_normalize:
        loud = voice_wav.replace(".wav", "-loud.wav")
        run(["ffmpeg", "-v", "error", "-i", voice_wav,
             "-af", f"loudnorm=I={args.lufs}:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1",
             "-y", loud])
        os.replace(loud, voice_wav)
    print(f"\n  -> {os.path.relpath(voice_wav, ROOT)}  ({duration(voice_wav):.2f}s"
          f"{'' if args.no_normalize else f', {args.lufs} LUFS'})")

    beats["voiceStatus"] = (
        f"gemini:{cfg['model']}/{cfg['voice']} — line timings are REAL (measured from the "
        f"audio). No per-word times: Gemini returns audio only. Run a forced aligner if a "
        f"track needs them.")
    for line in vo:
        line.pop("words", None)
    with open(beats_path, "w", encoding="utf-8") as f:
        json.dump(beats, f, ensure_ascii=False, indent="\t")
        f.write("\n")
    print(f"  -> {os.path.relpath(beats_path, ROOT)} updated")

    if args.mux:
        out_mp4 = args.mux.replace(".mp4", "-voiced.mp4")
        # No -shortest: the picture is the master. The bed above is already padded to the
        # composition length, so the two agree to within a frame and the tail survives.
        run(["ffmpeg", "-v", "error", "-i", args.mux, "-i", voice_wav,
             "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
             "-y", out_mp4])
        print(f"  -> {os.path.relpath(out_mp4, ROOT)}")


if __name__ == "__main__":
    main()
