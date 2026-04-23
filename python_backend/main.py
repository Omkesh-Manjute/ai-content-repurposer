from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
import subprocess
import json
import os
import httpx
import random
import uvicorn
import re

def clean_vtt_transcript(vtt_text):
    # 🕵️ Detect if it's JSON (YouTube JSON3 format)
    if vtt_text.strip().startswith('{'):
        try:
            data = json.loads(vtt_text)
            cleaned = []
            if "events" in data:
                for event in data["events"]:
                    if "segs" in event:
                        t = "".join([s.get("utf8", "") for s in event["segs"]]).strip()
                        if t: cleaned.append(t)
            
            full_text = " ".join(cleaned)
            full_text = re.sub(r"\s+", " ", full_text)
            return [{"text": full_text, "offset": 0}]
        except:
            pass # Fallback to VTT parsing if JSON fails

    # 📝 Standard VTT parsing (User's logic)
    lines = vtt_text.split("\n")
    cleaned = []

    for line in lines:
        line = line.strip()

        if (
            not line
            or "-->" in line
            or "WEBVTT" in line
            or line.isdigit()
            or "align:" in line
        ):
            continue

        # remove html tags
        line = re.sub(r"<.*?>", "", line)

        cleaned.append(line)

    full_text = " ".join(cleaned)

    # extra cleaning
    full_text = re.sub(r"\s+", " ", full_text)

    return [{"text": full_text, "offset": 0}]

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
        # Load configs from ENV (Railway)
        COOKIES_FILE = os.environ.get("YOUTUBE_COOKIES_PATH", "cookies.txt")
        PROXY = os.environ.get("YOUTUBE_PROXY")

        cmd = [
            "python", "-m", "yt_dlp",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--skip-download",
            "--print-json",
            "--user-agent", random.choice(USER_AGENTS)
        ]

        if os.path.exists(COOKIES_FILE):
            print(f"Using cookies from: {COOKIES_FILE}")
            cmd.extend(["--cookies", COOKIES_FILE])
        
        if PROXY:
            print("Using proxy for extraction")
            cmd.extend(["--proxy", PROXY])

        cmd.append(f"https://www.youtube.com/watch?v={video_id}")

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

        if r.ok:
            return clean_vtt_transcript(r.text)

        return None

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
                
                if vtt.status_code == 200:
                    return clean_vtt_transcript(vtt.text)

            except:
                continue

    return None


# 🧠 MAIN API
@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):
    # ✅ Step 1 — youtube-transcript-api (Fastest & Standard)
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-GB'])
        return {"transcript": [{"text": t['text'], "offset": int(t['start']*1000)} for t in transcript], "source": "library"}
    except:
        pass

    # ✅ Step 2 — yt-dlp (Most Reliable)
    data = get_transcript_ytdlp(video_id)
    if data:
        return {"transcript": data, "source": "yt-dlp"}

    # ✅ Step 3 — piped fallback
    data = await fetch_transcript_piped(video_id)
    if data:
        return {"transcript": data, "source": "piped"}

    # ❌ FAIL
    raise HTTPException(
        status_code=404,
        detail="Transcript not available (YouTube is blocking us or no captions available)"
    )


# 🚀 RUN
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)