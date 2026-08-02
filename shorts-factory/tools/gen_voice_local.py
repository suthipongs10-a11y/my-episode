#!/usr/bin/env python3
"""
gen_voice_local.py — voice track from a SELF-HOSTED TTS endpoint (RunPod, vLLM, whatever),
driven by the same beats.json as gen_voice.py.

Sibling of gen_voice.py, not a replacement. gen_voice.py stays the ElevenLabs path; this one
speaks to a server you run, so there is no per-character bill and no vendor in the loop.

WHAT IT CAN AND CANNOT DO — read this before wiring it into a track:

  ✅ vox shorts. They carry no burned captions (on-screen chips and statements carry the
     words), so all they need is per-LINE audio and honest line timings. This tool is a
     drop-in for that.

  ❌ the short-N TSX track, on its own. Those captions highlight the exact spoken WORD, and
     that needs per-word timestamps. ElevenLabs returns them from /with-timestamps; a raw TTS
     server does not. Recover them with forced alignment over the audio this writes
     (whisperx / ctc-forced-aligner / MFA), then feed the result to gen_voice.py's emit_ts
     format. For Thai add a word segmenter first — Thai script has no spaces, so "per word"
     is not even defined until something segments it (pythainlp's newmm).

CONFIGURATION — all of it environment, nothing hardcoded (CLAUDE.md §2.1):

  LOCAL_TTS_URL     required. Full endpoint, e.g. https://<pod>-8000.proxy.runpod.net/v1/audio/speech
  LOCAL_TTS_MODEL   model id the server expects                            [default: tts-1]
  LOCAL_TTS_VOICE   voice/speaker id                                       [default: default]
  LOCAL_TTS_FORMAT  wav | mp3 | opus — what the server returns             [default: wav]
  LOCAL_TTS_API_KEY optional bearer token, if the pod is behind one
  LOCAL_TTS_LANG    language sent with every line, e.g. th                    [default: unset]
  LOCAL_TTS_BODY    optional JSON template for a non-OpenAI server. Use the placeholders
                    {text} {model} {voice} {format}, e.g.
                      '{"text":"{text}","speaker":"{voice}","language":"th"}'
                    The default is the OpenAI /v1/audio/speech shape, which most self-host
                    wrappers (vLLM, openedai-speech, most RunPod templates) already expose,
                    and which tools/omnivoice_server.py speaks. Setting this disables the
                    extra fields below, since a custom template controls the whole body.

--fit-window AND WHY IT IS THE POINT WITH OMNIVOICE

  beats.json already says how long every line has. OmniVoice's generate() takes a `duration`
  in seconds and synthesises to exactly that, so --fit-window sends the window per line and
  the audio comes back already fitting. Nothing is time-stretched afterwards — gen_voice.py
  has to atempo ElevenLabs output to make it fit, and that is audible past about 1.15x.

  Servers that ignore an unknown `duration` field just behave as before, and the drift
  report will say so.

Usage:
  python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json --dry-run
  python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json
  python tools/gen_voice_local.py --beats ... --retime      # rewrite windows from real audio
  python tools/gen_voice_local.py --beats ... --mux remotion/out/Vox2ThaiRice.mp4

Lines are cached by (index, text-hash): rewriting one line only regenerates that line.
ffmpeg/ffprobe on PATH. Stdlib only, like the rest of tools/.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BODY = '{"model":"{model}","input":"{text}","voice":"{voice}","response_format":"{format}"}'


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


def build_body(cfg, text, seconds):
    """The request body.

    With a custom LOCAL_TTS_BODY we fill the caller's template verbatim and add nothing —
    they own the shape. Otherwise we build the OpenAI shape as a dict, which lets the
    optional fields (language, duration) be attached properly instead of string-patched in.
    """
    if cfg.get("template"):
        esc = json.dumps(text)[1:-1]  # JSON escaping, without the surrounding quotes
        return (cfg["template"]
                .replace("{text}", esc)
                .replace("{model}", cfg["model"])
                .replace("{voice}", cfg["voice"])
                .replace("{format}", cfg["format"])).encode("utf-8")
    body = {"model": cfg["model"], "input": text, "voice": cfg["voice"],
            "response_format": cfg["format"]}
    if cfg.get("language"):
        body["language"] = cfg["language"]
    if seconds:
        body["duration"] = round(seconds, 3)
    return json.dumps(body, ensure_ascii=False).encode("utf-8")


def synth(cfg, text, out_path, seconds=None):
    body = build_body(cfg, text, seconds)
    headers = {"Content-Type": "application/json"}
    if cfg.get("api_key"):
        headers["Authorization"] = f"Bearer {cfg['api_key']}"
    req = urllib.request.Request(cfg["url"], data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            audio = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"TTS server returned {e.code} for {text!r}\n{e.read().decode('utf-8', 'replace')[:600]}")
    except Exception as e:
        sys.exit(f"TTS server unreachable at {cfg['url']}: {type(e).__name__}: {e}")
    if not audio:
        sys.exit(f"TTS server returned an empty body for {text!r}")
    with open(out_path, "wb") as f:
        f.write(audio)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats", required=True, help="path to the video's beats.json")
    ap.add_argument("--url", help="override LOCAL_TTS_URL")
    ap.add_argument("--voice", help="override LOCAL_TTS_VOICE")
    ap.add_argument("--model", help="override LOCAL_TTS_MODEL")
    ap.add_argument("--fit-window", action="store_true",
                    help="ask the server to synthesise each line to EXACTLY its beats.json "
                         "window (OmniVoice's `duration`). Mutually exclusive with --retime.")
    ap.add_argument("--language", help="override LOCAL_TTS_LANG, e.g. th")
    ap.add_argument("--retime", action="store_true",
                    help="rewrite beats.json start/end from the REAL audio durations, packed "
                         "in order with --gap between lines, instead of keeping the estimates")
    ap.add_argument("--gap", type=float, default=0.6, help="seconds between lines when --retime [0.6]")
    ap.add_argument("--force", action="store_true", help="regenerate every line, ignoring the cache")
    ap.add_argument("--mux", help="rendered mp4 to mux the voice onto (writes -voiced.mp4)")
    ap.add_argument("--dry-run", action="store_true", help="plan only; contact nothing")
    args = ap.parse_args()

    env = load_env()
    cfg = {
        "url": args.url or env.get("LOCAL_TTS_URL"),
        "model": args.model or env.get("LOCAL_TTS_MODEL", "tts-1"),
        "voice": args.voice or env.get("LOCAL_TTS_VOICE", "default"),
        "format": env.get("LOCAL_TTS_FORMAT", "wav"),
        "api_key": env.get("LOCAL_TTS_API_KEY"),
        "language": args.language or env.get("LOCAL_TTS_LANG"),
        "template": env.get("LOCAL_TTS_BODY"),
    }
    if args.fit_window and args.retime:
        sys.exit("--fit-window and --retime contradict each other: one makes the audio fit "
                 "the windows, the other makes the windows fit the audio. Pick one.")
    if args.fit_window and cfg["template"]:
        sys.exit("--fit-window cannot be used with a custom LOCAL_TTS_BODY — that template "
                 "owns the whole request, so there is nowhere to put `duration`.")
    if not cfg["url"] and not args.dry_run:
        sys.exit("LOCAL_TTS_URL is not set (env or .env). See this file's docstring.")

    beats_path = os.path.abspath(args.beats)
    beats = json.load(open(beats_path, encoding="utf-8"))
    vo = beats["vo"]
    proj = os.path.dirname(beats_path)
    vdir = os.path.join(proj, "voice")
    os.makedirs(vdir, exist_ok=True)

    print(f"{beats['id']}: {len(vo)} lines -> {os.path.relpath(vdir, ROOT)}")
    print(f"  endpoint: {cfg['url'] or '(unset)'}")
    print(f"  model={cfg['model']}  voice={cfg['voice']}  format={cfg['format']}"
          f"  lang={cfg['language'] or '-'}"
          f"{'  fit-window' if args.fit_window else ''}\n")

    clips = []
    for i, line in enumerate(vo):
        text = line["text"]
        h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
        out = os.path.join(vdir, f"line-{i:02d}-{h}.{cfg['format']}")
        cached = os.path.exists(out) and not args.force
        if args.dry_run:
            print(f"  [{i}] {'cached' if cached else 'would generate'}: {text[:64]}…")
            continue
        window = (line["end"] - line["start"]) if args.fit_window else None
        if not cached:
            synth(cfg, text, out, window)
        d = duration(out)
        clips.append({"path": out, "dur": d, "line": line})
        est = line["end"] - line["start"]
        drift = d - est
        if args.fit_window and abs(drift) > 0.25:
            flag = "  <-- server IGNORED `duration`"
        elif drift > 0.25:
            flag = "  <-- OVERFLOWS its window"
        else:
            flag = ""
        print(f"  [{i}] {d:5.2f}s  (window {est:5.2f}s, drift {drift:+.2f}s){flag}")

    if args.dry_run:
        print("\ndry run: nothing contacted, nothing written")
        return

    # --- lay the clips onto one timeline -------------------------------------------------
    # Two policies. Default keeps the authored windows, which is what you want when the cues
    # in the composition are already tuned to them. --retime trusts the audio instead and
    # rewrites the windows, which is what you want when the VO is a different language or a
    # different length from the estimate — then the composition's CUE table has to follow.
    if args.retime:
        t = vo[0]["start"]
        for c in clips:
            c["at"] = round(t, 3)
            c["line"]["start"] = round(t, 3)
            c["line"]["end"] = round(t + c["dur"], 3)
            t += c["dur"] + args.gap
        print(f"\nretimed: VO now ends at {t - args.gap:.2f}s")
    else:
        for c in clips:
            c["at"] = c["line"]["start"]

    total = max(c["at"] + c["dur"] for c in clips)
    dur_target = beats.get("format", {}).get("durationSec", total)
    voice_wav = os.path.join(vdir, "voice.wav")

    # One ffmpeg pass: every clip delayed to its start, all summed onto a silent bed.
    inputs, filters, labels = [], [], []
    for i, c in enumerate(clips):
        inputs += ["-i", c["path"]]
        filters.append(f"[{i}:a]aresample=48000,adelay={int(c['at'] * 1000)}|{int(c['at'] * 1000)}[a{i}]")
        labels.append(f"[a{i}]")
    filters.append(f"{''.join(labels)}amix=inputs={len(clips)}:normalize=0:dropout_transition=0[out]")
    run(["ffmpeg", "-v", "error", *inputs, "-filter_complex", ";".join(filters),
         "-map", "[out]", "-t", str(max(total, dur_target)), "-ar", "48000", "-ac", "1",
         "-y", voice_wav])
    print(f"\n  -> {os.path.relpath(voice_wav, ROOT)}  ({duration(voice_wav):.2f}s)")

    # No per-word times: this server does not return them, and inventing them would put the
    # captions on the wrong words. Say so in the file rather than leaving a silent gap.
    beats["voiceStatus"] = (f"local:{cfg['model']}/{cfg['voice']} — line timings are REAL "
                            f"(measured from the audio). No per-word times: a self-hosted TTS "
                            f"does not return them. Run a forced aligner if a track needs them.")
    for line in vo:
        line.pop("words", None)
    with open(beats_path, "w", encoding="utf-8") as f:
        json.dump(beats, f, ensure_ascii=False, indent="\t")
        f.write("\n")
    print(f"  -> {os.path.relpath(beats_path, ROOT)} updated")

    if args.mux:
        out_mp4 = args.mux.replace(".mp4", "-voiced.mp4")
        run(["ffmpeg", "-v", "error", "-i", args.mux, "-i", voice_wav,
             "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
             "-shortest", "-y", out_mp4])
        print(f"  -> {os.path.relpath(out_mp4, ROOT)}")


if __name__ == "__main__":
    main()
