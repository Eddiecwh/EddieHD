#!/usr/bin/env python3
"""Eddie local server.

Serves the page from ./public and forwards text-to-speech requests to a
neural TTS provider, so your API key stays on this machine and never
reaches the browser.

Run:  python3 server.py        then open http://localhost:8765 in Chrome.
Keys: put them in a .env file next to this script (see .env.example).
"""
import hashlib
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", 8765))


def load_env():
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_env()


def provider():
    chosen = os.environ.get("TTS_PROVIDER", "").lower()
    if chosen in ("openai", "elevenlabs"):
        return chosen
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    return None


# Same text + same voice settings = same audio, so keep it and save money.
CACHE: dict[str, bytes] = {}


def post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def tts_openai(text, voice, style):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is missing from .env")
    body = {
        "model": os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        "voice": voice or os.environ.get("OPENAI_VOICE", "ballad"),
        "input": text,
        "response_format": "mp3",
    }
    if style:
        body["instructions"] = style  # how to speak: tone, pace, emotion
    return post(
        "https://api.openai.com/v1/audio/speech",
        {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        body,
    )


def tts_elevenlabs(text, voice, style):
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = voice or os.environ.get("ELEVENLABS_VOICE_ID")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing from .env")
    if not voice_id:
        raise RuntimeError("ELEVENLABS_VOICE_ID is missing from .env")
    return post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        {"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        {
            "text": text,
            "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.4, "similarity_boost": 0.75, "style": 0.35},
        },
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

    def send_json(self, status, data):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/tts/status":
            return self.send_json(200, {"provider": provider()})
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/tts":
            return self.send_json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(min(length, 20_000)) or b"{}")
            text = str(req.get("text", "")).strip()[:600]
            voice = str(req.get("voice", "")).strip()
            style = str(req.get("style", "")).strip()[:1500]
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {"error": "bad request"})
        if not text:
            return self.send_json(400, {"error": "no text"})

        which = provider()
        if not which:
            return self.send_json(501, {"error": "no TTS key set; add one to .env"})

        cache_key = hashlib.sha256(json.dumps([which, voice, style, text]).encode()).hexdigest()
        audio = CACHE.get(cache_key)
        if audio is None:
            try:
                audio = (tts_openai if which == "openai" else tts_elevenlabs)(text, voice, style)
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")[:300]
                return self.send_json(502, {"error": f"{which} said {e.code}: {detail}"})
            except Exception as e:  # network trouble, missing settings
                return self.send_json(502, {"error": str(e)})
            CACHE[cache_key] = audio

        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.end_headers()
        self.wfile.write(audio)

    def log_message(self, fmt, *args):
        if args and "/api/" in str(args[0]):  # only log API calls, not every file
            super().log_message(fmt, *args)


if __name__ == "__main__":
    print(f"Eddie is awake on http://localhost:{PORT}  (TTS provider: {provider() or 'none, using browser voice'})")
    # 127.0.0.1 only: nobody else on your network can use your key.
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
