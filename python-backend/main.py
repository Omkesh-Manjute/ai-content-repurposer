from fastapi import FastAPI, HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Allow CORS for your Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "YouTube Transcript API is running"}

@app.get("/transcript/{video_id}")
def get_transcript(video_id: str):
    try:
        # Try fetching transcript
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Format the output to match what the Next.js app expects
        formatted_transcript = []
        for entry in transcript_list:
            formatted_transcript.append({
                "text": entry['text'],
                "offset": int(entry['start'] * 1000) # Convert to ms
            })
            
        return {"transcript": formatted_transcript}
    
    except Exception as e:
        print(f"Error fetching transcript for {video_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
