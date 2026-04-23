from fastapi import FastAPI, HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
def get_transcript(video_id: str):
    # Try multiple strategies in Python
    try:
        # Strategy 1: Standard
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'hi', 'en-GB'])
    except Exception as e1:
        try:
            # Strategy 2: List transcripts first (more robust)
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id).find_transcript(['en', 'hi']).fetch()
        except Exception as e2:
            print(f"All Python strategies failed for {video_id}")
            raise HTTPException(status_code=404, detail="YouTube is blocking even the Python backend. Try a different video.")

    # Format output
    formatted_transcript = []
    for entry in transcript_list:
        formatted_transcript.append({
            "text": entry['text'],
            "offset": int(entry['start'] * 1000)
        })
            
    return {"transcript": formatted_transcript}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
