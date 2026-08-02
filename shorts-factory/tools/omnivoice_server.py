#!/usr/bin/env python3
"""
omnivoice_server.py — a tiny OpenAI-shaped HTTP front end for k2-fsa/OmniVoice.

THIS FILE RUNS ON THE GPU POD, not on the machine that edits videos. OmniVoice ships a
Python API, a CLI and a Gradio demo, but no HTTP server — so `tools/gen_voice_local.py`
has nothing to talk to until something like this is running. Copy it to the pod, start it,
point LOCAL_TTS_URL at it.

    pip install "omnivoice[tn]"                   # [tn] = spoken numbers/dates; see below
    python omnivoice_server.py --port 8000 --device cuda:0 \
        --language th --instruct "male, middle-aged, warm, calm documentary narrator"

    # then, on the editing machine:
    export LOCAL_TTS_URL=https://<pod-id>-8000.proxy.runpod.net/v1/audio/speech
    python tools/gen_voice_local.py --beats vox-shorts/vox-2-thai-rice/beats.json --fit-window

Why the OpenAI shape: it is what gen_voice_local.py speaks by default, and what most other
tooling expects, so nothing downstream needs to know OmniVoice is behind it.

WHAT THIS EXPOSES BEYOND THE OPENAI FIELDS, and why each one matters here:

  duration   seconds. OmniVoice will synthesise to a FIXED length. This is the feature that
             makes it a better fit for this pipeline than a hosted API: beats.json already
             says how long each line has, so the audio can be made to fit instead of being
             time-stretched afterwards the way gen_voice.py has to atempo ElevenLabs output.
  language   "th" / "Thai". Optional but the model does better when told; Thai is 10th of
             OmniVoice's 646 languages by training hours (~10.5k h), not a long-tail entry.
  instruct   voice DESIGN — describe the speaker in words, no reference clip needed.
  speed      alternative to duration; ignored when duration is set.

VOICE CONSISTENCY IS A CHANNEL DECISION. Three modes, in descending order of how repeatable
they are across episodes:

  1. --voice-prompt my_voice.pt   a saved VoiceClonePrompt. Identical voice forever. This is
                                  the one to use once the channel has a voice it likes.
                                  Build it once with model.create_voice_clone_prompt().
  2. --instruct "..."             voice design. Same words give a similar voice, not a
                                  byte-identical one. Fine for drafts.
  3. neither                      the model picks. Different every run — do not ship this.

Reference-clip tip from the OmniVoice docs, worth repeating because it bites: use a 3–10s
clip in the SAME language as the target, or the output carries an accent from the
reference's language.

No per-word timestamps — OmniVoice does not produce them. See gen_voice_local.py's header.
"""
import argparse
import io
import json
import os
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SAMPLE_RATE = 24000  # OmniVoice generates at 24 kHz

_model = None
_prompt = None
_lock = threading.Lock()  # one generate() at a time; the model is not re-entrant
_defaults = {}


def load_model(model_id, device, dtype_name, voice_prompt):
    global _model, _prompt
    import torch
    from omnivoice import OmniVoice

    dtype = {"float16": torch.float16, "bfloat16": torch.bfloat16, "float32": torch.float32}[dtype_name]
    print(f"loading {model_id} on {device} ({dtype_name}) ...", flush=True)
    _model = OmniVoice.from_pretrained(model_id, device_map=device, dtype=dtype)
    if voice_prompt:
        from omnivoice import VoiceClonePrompt

        _prompt = VoiceClonePrompt.load(voice_prompt)
        print(f"  voice clone prompt: {voice_prompt}", flush=True)
    print("ready", flush=True)


def to_wav(samples):
    """float32 [-1,1] numpy -> 16-bit mono WAV bytes. stdlib only; no soundfile needed."""
    import numpy as np

    a = np.asarray(samples, dtype=np.float32)
    peak = float(np.max(np.abs(a))) if a.size else 0.0
    if peak > 1.0:
        a = a / peak
    pcm = (np.clip(a, -1.0, 1.0) * 32767.0).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code, obj):
        self._send(code, json.dumps(obj).encode(), "application/json")

    def do_GET(self):
        if self.path.rstrip("/") in ("/healthz", "/health"):
            self._json(200, {"ok": _model is not None, "sample_rate": SAMPLE_RATE,
                             "voice_clone_prompt": _prompt is not None, "defaults": _defaults})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") not in ("/v1/audio/speech", "/v1/audio/speech/"):
            return self._json(404, {"error": "not found; POST /v1/audio/speech"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            req = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            return self._json(400, {"error": f"bad JSON: {e}"})

        text = req.get("input") or req.get("text")
        if not text:
            return self._json(400, {"error": "missing 'input' (or 'text')"})

        kw = {"text": text}
        lang = req.get("language") or _defaults.get("language")
        if lang:
            kw["language"] = lang
        # duration wins over speed — that is OmniVoice's own precedence, kept explicit here
        if req.get("duration"):
            kw["duration"] = float(req["duration"])
        elif req.get("speed"):
            kw["speed"] = float(req["speed"])
        if _prompt is not None:
            kw["voice_clone_prompt"] = _prompt
        else:
            instruct = req.get("instruct") or _defaults.get("instruct")
            if instruct:
                kw["instruct"] = instruct
        # numbers/dates are all over a documentary script ("1945", "11.68") and read wrong
        # unspoken; default it ON here and let a caller turn it off explicitly.
        kw["normalize_text"] = bool(req.get("normalize_text", _defaults.get("normalize_text", True)))

        try:
            with _lock:
                audio = _model.generate(**kw)
        except Exception as e:
            # normalize_text pulls in optional deps (WeTextProcessing for zh/en, num2words
            # elsewhere). A pod without `omnivoice[tn]` should still speak the line rather
            # than 500 — but say so, because "1945" will come out as digits-not-words.
            if kw.get("normalize_text"):
                print(f"  normalize_text failed ({type(e).__name__}: {e}); retrying raw. "
                      f"Install omnivoice[tn] on this pod for spoken numbers and dates.",
                      flush=True)
                kw["normalize_text"] = False
                try:
                    with _lock:
                        audio = _model.generate(**kw)
                except Exception as e2:
                    return self._json(500, {"error": f"{type(e2).__name__}: {e2}"})
            else:
                return self._json(500, {"error": f"{type(e).__name__}: {e}"})

        try:
            body = to_wav(audio[0])
        except Exception as e:
            return self._json(500, {"error": f"could not encode WAV: {type(e).__name__}: {e}"})
        secs = len(body) / (SAMPLE_RATE * 2)
        print(f'  {secs:5.2f}s  "{str(text)[:60]}"', flush=True)
        self._send(200, body, "audio/wav")

    def log_message(self, *a):
        pass  # the per-request line above is the log we actually want


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--model", default=os.environ.get("OMNIVOICE_MODEL", "k2-fsa/OmniVoice"))
    ap.add_argument("--device", default=os.environ.get("OMNIVOICE_DEVICE", "cuda:0"),
                    help="cuda:0 | mps (Apple Silicon) | xpu (Intel Arc) | cpu")
    ap.add_argument("--dtype", default=os.environ.get("OMNIVOICE_DTYPE", "float16"),
                    choices=["float16", "bfloat16", "float32"])
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=int(os.environ.get("OMNIVOICE_PORT", 8000)))
    ap.add_argument("--voice-prompt", default=os.environ.get("OMNIVOICE_VOICE_PROMPT"),
                    help="path to a saved VoiceClonePrompt (.pt) — the repeatable option")
    ap.add_argument("--instruct", default=os.environ.get("OMNIVOICE_INSTRUCT"),
                    help='voice design fallback, e.g. "male, middle-aged, warm, calm"')
    ap.add_argument("--language", default=os.environ.get("OMNIVOICE_LANGUAGE"),
                    help='default language for requests that omit one, e.g. "th"')
    args = ap.parse_args()

    _defaults.update({k: v for k, v in
                      (("language", args.language), ("instruct", args.instruct)) if v})
    if not args.voice_prompt and not args.instruct:
        print("WARNING: no --voice-prompt and no --instruct. The model will pick a voice, and\n"
              "         it will pick a DIFFERENT one on other runs. Fine for a test, not for\n"
              "         a channel — see this file's header.", flush=True)

    load_model(args.model, args.device, args.dtype, args.voice_prompt)
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"listening on http://{args.host}:{args.port}  (POST /v1/audio/speech, GET /healthz)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
