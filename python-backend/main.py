from fastapi import FastAPI, HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import uvicorn
import os
import httpx
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
]

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Collega Python Engine is Live"}

async def fetch_transcript_piped(video_id: str):
    piped_instances = ["https://pipedapi.kavin.rocks", "https://pipedapi.tokhmi.xyz", "https://pipedapi.moomoo.me"]
    async with httpx.AsyncClient(timeout=15.0) as client:
        for api in piped_instances:
            try:
                res = await client.get(f"{api}/streams/{video_id}")
                if res.status_code == 200:
                    data = res.json()
                    subs = next((s for s in data.get("subtitles", []) if s.get("code") == "en"), None)
                    if not subs and data.get("subtitles"): subs = data["subtitles"][0]
                    if subs and subs.get("url"):
                        vtt_res = await client.get(subs["url"])
                        lines = vtt_res.text.split("\n")
                        transcript = []
                        for line in lines:
                            if "-->" not in line and line.strip() and not line.strip().isdigit() and "WEBVTT" not in line:
                                transcript.append({"text": line.strip(), "start": 0})
                        return transcript
            except: continue
    return None

def get_transcript_yt_dlp(video_id: str):
    """The most robust extraction via yt-dlp metadata."""
    try:
        cmd = ["yt-dlp", "--dump-json", "--flat-playlist", f"https://www.youtube.com/watch?v={video_id}"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            # Find any subtitle track URL
            sub_url = None
            if "subtitles" in data and "en" in data["subtitles"]:
                sub_url = data["subtitles"]["en"][0]["url"]
            elif "automatic_captions" in data and "en" in data["automatic_captions"]:
                sub_url = data["automatic_captions"]["en"][0]["url"]
            
            if sub_url:
                # We fetch manually if found
                import requests
                r = requests.get(sub_url)
                if r.ok:
                    # Very simple parsing
                    return [{"text": line.strip(), "start": 0} for line in r.text.split('\n') if line.strip() and '-->' not in line and 'WEBVTT' not in line]
        return None
    except: return None

@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):
    # Strategy 1: Library
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-GB'])
        return {"transcript": [{"text": t['text'], "offset": int(t['start']*1000)} for t in transcript]}
    except: pass

    # Strategy 2: List Transcripts
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = transcript_list.find_transcript(['en', 'hi', 'en-GB']).fetch()
        return {"transcript": [{"text": t['text'], "offset": int(t['start']*1000)} for t in transcript]}
    except: pass

    # Strategy 3: Piped API (Very reliable)
    piped_data = await fetch_transcript_piped(video_id)
    if piped_data:
        return {"transcript": [{"text": t['text'], "offset": t['start']} for t in piped_data]}

    # Strategy 4: yt-dlp Metadata
    yt_dlp_data = get_transcript_yt_dlp(video_id)
    if yt_dlp_data:
        return {"transcript": [{"text": t['text'], "offset": t['start']} for t in yt_dlp_data]}

    raise HTTPException(status_code=404, detail="All extraction strategies failed. YouTube is blocking this video.")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
