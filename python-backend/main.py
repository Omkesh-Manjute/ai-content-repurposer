from fastapi import FastAPI, HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import uvicorn
import os

import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def fetch_from_piped(video_id: str):
    """Fallback: Fetch transcript from Piped API if YouTube blocks us."""
    import httpx
    piped_instances = ["https://pipedapi.kavin.rocks", "https://pipedapi.tokhmi.xyz", "https://pipedapi.moomoo.me"]
    async with httpx.AsyncClient(timeout=10.0) as client:
        for api in piped_instances:
            try:
                res = await client.get(f"{api}/streams/{video_id}")
                if res.status_code == 200:
                    data = res.json()
                    # Find English subtitles
                    subs = next((s for s in data.get("subtitles", []) if s.get("code") == "en"), None)
                    if not subs and data.get("subtitles"):
                        subs = data["subtitles"][0]
                    
                    if subs and subs.get("url"):
                        vtt_res = await client.get(subs["url"])
                        # Simple VTT to text parsing
                        lines = vtt_res.text.split("\n")
                        transcript = []
                        for line in lines:
                            if "-->" not in line and line.strip() and not line.strip().isdigit() and "WEBVTT" not in line:
                                transcript.append({"text": line.strip(), "start": 0})
                        return transcript
            except:
                continue
    return None

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Advanced YouTube Transcript API is running"}

def get_transcript_yt_dlp(video_id: str):
    try:
        # Use yt-dlp to get subtitles/transcript
        # This is a very robust fallback
        cmd = [
            "yt-dlp",
            "--write-auto-subs",
            "--skip-download",
            "--print", "subtitles",
            f"https://www.youtube.com/watch?v={video_id}"
        ]
        # For now, we stick to the library but yt-dlp is there if needed.
        # Actually, let's try a better library call for youtube_transcript_api
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-GB'])
        return transcript_list
    except Exception as e:
        raise e

@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):
    # Strategy 1: Standard
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-GB'])
    except Exception as e1:
        try:
            # Strategy 2: List transcripts first
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id).find_transcript(['en', 'hi']).fetch()
        except Exception as e2:
            # Strategy 3: Piped API Fallback (The "Permanent" Fix)
            print(f"Direct strategies failed for {video_id}. Trying Piped fallback...")
            transcript_list = await fetch_from_piped(video_id)
            if not transcript_list:
                print(f"All strategies failed for {video_id}")
                raise HTTPException(status_code=404, detail="YouTube is blocking even the secondary servers. Try again in 5 minutes.")

    # Format output
    formatted_transcript = []
    for entry in transcript_list:
        formatted_transcript.append({
            "text": entry['text'],
            "offset": int(entry.get('start', 0) * 1000)
        })
            
    return {"transcript": formatted_transcript}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
