from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import os
import httpx
import random
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔁 Rotate user agents (anti-block)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) Chrome/118.0.0.0"
]

@app.get("/")
def home():
    return {"status": "ok", "msg": "Backend Running 🚀"}

# 🧠 STRATEGY 1 — yt-dlp (MOST RELIABLE)
def get_transcript_ytdlp(video_id: str):
    try:
        cmd = [
            "yt-dlp",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--skip-download",
            "--print-json",
            f"https://www.youtube.com/watch?v={video_id}"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print("yt-dlp failed")
            return None

        data = json.loads(result.stdout)

        sub_url = None
        if "automatic_captions" in data and "en" in data["automatic_captions"]:
            sub_url = data["automatic_captions"]["en"][0]["url"]

        if not sub_url:
            return None

        import requests
        r = requests.get(sub_url, headers={"User-Agent": random.choice(USER_AGENTS)})

        if not r.ok:
            return None

        transcript = []
        for line in r.text.split("\n"):
            if line.strip() and "-->" not in line and "WEBVTT" not in line:
                transcript.append({
                    "text": line.strip(),
                    "offset": 0
                })

        return transcript

    except Exception as e:
        print("yt-dlp error:", e)
        return None

# 🧠 STRATEGY 2 — PIPED (Fallback)
async def fetch_transcript_piped(video_id: str):
    piped_instances = [
        "https://pipedapi.adminforge.de",
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz"
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for api in piped_instances:
            try:
                res = await client.get(f"{api}/streams/{video_id}")
                if res.status_code != 200:
                    continue

                data = res.json()
                subs = data.get("subtitles", [])

                if not subs:
                    continue

                sub_url = subs[0].get("url")
                if not sub_url:
                    continue

                vtt = await client.get(sub_url)
                lines = vtt.text.split("\n")

                transcript = []
                for line in lines:
                    if line.strip() and "-->" not in line and "WEBVTT" not in line:
                        transcript.append({
                            "text": line.strip(),
                            "offset": 0
                        })

                if transcript:
                    return transcript

            except:
                continue

    return None

# 🧠 MAIN API
@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):

    # ✅ Step 1 — yt-dlp
    data = get_transcript_ytdlp(video_id)
    if data:
        return {"transcript": data, "source": "yt-dlp"}

    # ✅ Step 2 — piped fallback
    data = await fetch_transcript_piped(video_id)
    if data:
        return {"transcript": data, "source": "piped"}

    # ❌ FAIL
    raise HTTPException(
        status_code=404,
        detail="Transcript not available (video blocked or no captions)"
    )

# 🚀 RUN
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
