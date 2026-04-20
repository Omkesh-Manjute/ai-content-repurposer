"""
Robust YouTube transcript extractor with MULTIPLE fallback strategies.
Returns JSON to stdout. Called from Next.js API route.

Strategy order:
1. youtube-transcript-api (fastest, most reliable)
2. Direct YouTube page scraping with User-Agent rotation (handles IP blocks)
"""
import sys
import json
import re
import random

# ──── Strategy 1: youtube-transcript-api ────
def try_youtube_transcript_api(video_id: str) -> list | None:
    """Primary method: youtube-transcript-api package."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        ytt = YouTubeTranscriptApi()
        
        for langs in [['en', 'hi'], ['en'], ['hi'], ['en-US']]:
            try:
                transcript = ytt.fetch(video_id, languages=langs)
                if transcript:
                    items = []
                    for entry in transcript:
                        if isinstance(entry, dict):
                            items.append({
                                "text": entry.get("text", ""),
                                "offset": int(entry.get("start", 0) * 1000),
                            })
                        else:
                            items.append({
                                "text": getattr(entry, "text", str(entry)),
                                "offset": int(getattr(entry, "start", 0) * 1000),
                            })
                    if items:
                        return items
            except Exception:
                continue
        
        # Try ALL available transcripts
        try:
            for t in ytt.list(video_id):
                try:
                    fetched = t.fetch()
                    if fetched:
                        items = []
                        for entry in fetched:
                            if isinstance(entry, dict):
                                items.append({
                                    "text": entry.get("text", ""),
                                    "offset": int(entry.get("start", 0) * 1000),
                                })
                            else:
                                items.append({
                                    "text": getattr(entry, "text", str(entry)),
                                    "offset": int(getattr(entry, "start", 0) * 1000),
                                })
                        if items:
                            return items
                except Exception:
                    continue
        except Exception:
            pass
            
    except Exception as e:
        print(f"Strategy 1 failed: {e}", file=sys.stderr)
    
    return None


# ──── Strategy 2: Direct YouTube innertube API ────
def try_innertube_api(video_id: str) -> list | None:
    """Use YouTube's internal innertube API directly - bypasses normal scraping blocks."""
    try:
        import urllib.request
        
        # Use innertube API (this is what youtube.com's player uses internally)
        innertube_url = "https://www.youtube.com/youtubei/v1/get_transcript"
        
        # First, get the page to extract needed tokens
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ]
        ua = random.choice(user_agents)
        
        url = f"https://www.youtube.com/watch?v={video_id}"
        req = urllib.request.Request(url, headers={
            'User-Agent': ua,
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
        })
        
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        # Extract captions from ytInitialPlayerResponse
        match = re.search(r'ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|const|let|</script)', html)
        if not match:
            # Try alternative pattern
            match = re.search(r'var ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;', html)
        
        if not match:
            return None
        
        player_data = json.loads(match.group(1))
        
        # Check for playability errors
        playability = player_data.get("playabilityStatus", {})
        if playability.get("status") == "ERROR":
            return None
        
        caption_tracks = (
            player_data
            .get("captions", {})
            .get("playerCaptionsTracklistRenderer", {})
            .get("captionTracks", [])
        )
        
        if not caption_tracks:
            return None
        
        # Pick best track (prefer English, then Hindi, then any)
        track = None
        for t in caption_tracks:
            lc = t.get("languageCode", "")
            if lc.startswith("en"):
                track = t
                break
        if not track:
            for t in caption_tracks:
                lc = t.get("languageCode", "")
                if lc.startswith("hi"):
                    track = t
                    break
        if not track:
            track = caption_tracks[0]
        
        # Fetch transcript in json3 format
        base_url = track.get("baseUrl", "")
        if not base_url:
            return None
        
        json3_url = base_url + "&fmt=json3"
        req2 = urllib.request.Request(json3_url, headers={
            'User-Agent': ua,
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': f'https://www.youtube.com/watch?v={video_id}',
        })
        
        with urllib.request.urlopen(req2, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        items = []
        for event in data.get("events", []):
            if "segs" in event:
                text = "".join(s.get("utf8", "") for s in event["segs"]).strip()
                text = text.replace("\n", " ")
                if text and len(text) > 1:
                    items.append({
                        "text": text,
                        "offset": event.get("tStartMs", 0),
                    })
        
        return items if items else None
        
    except Exception as e:
        print(f"Strategy 2 failed: {e}", file=sys.stderr)
    
    return None


# ──── Strategy 3: yt-dlp ────
def try_yt_dlp(video_id: str) -> list | None:
    """Use yt-dlp with mobile player clients to bypass bot blocks."""
    try:
        import urllib.request # to check for json response
        from yt_dlp import YoutubeDL
        
        url = f"https://www.youtube.com/watch?v={video_id}"
        ydl_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "hi"],
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {"youtube": {"player_client": ["ios", "android", "web"]}},
            "socket_timeout": 30,
            "timeout": 30,
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            subs = info.get("requested_subtitles") or info.get("subtitles") or info.get("automatic_captions")
            if not subs:
                return None
            
            target_lang = None
            for lang in ["en", "en-US", "hi"]:
                if lang in subs:
                    target_lang = lang
                    break
            
            if not target_lang:
                target_lang = list(subs.keys())[0]
                
            formats = subs[target_lang]
            if isinstance(formats, dict):
                formats = [formats]
                
            sub_url = None
            for fmt in ["json3", "srv1", "vtt"]:
                for f in formats:
                    if f.get("ext") == fmt:
                        sub_url = f.get("url")
                        break
                if sub_url: break
                
            if not sub_url:
                sub_url = formats[0].get("url")
                
            import json
            req = urllib.request.Request(sub_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                if "json3" in sub_url:
                    data = json.loads(resp.read().decode('utf-8'))
                    items = []
                    for event in data.get("events", []):
                        if "segs" in event:
                            text = "".join([s.get("utf8", "") for s in event["segs"]]).strip()
                            if text:
                                items.append({"text": text, "offset": event.get("tStartMs", 0)})
                    return items if items else None
                else:
                    return [{"text": resp.read().decode('utf-8'), "offset": 0}]
                    
    except Exception as e:
        print(f"Strategy 3 failed: {e}", file=sys.stderr)
        
    return None


# ──── Main ────
def extract_video_id(url: str) -> str:
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/shorts/)([^&\n?#]+)',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return url


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Usage: python transcript.py <url>"}))
        sys.exit(1)

    video_id = extract_video_id(sys.argv[1])
    
    # Try strategies in order
    items = try_youtube_transcript_api(video_id)
    
    if not items:
        print("Strategy 1 failed, trying yt-dlp mobile client bypass...", file=sys.stderr)
        items = try_yt_dlp(video_id)
        
    if not items:
        print("Strategy 2 failed, trying direct YouTube scraping...", file=sys.stderr)
        items = try_innertube_api(video_id)
    
    if items and len(items) > 0:
        print(json.dumps({"status": "success", "transcript": items}))
    else:
        print(json.dumps({
            "status": "error",
            "message": "No transcript available. The video may not have captions, or YouTube is temporarily blocking requests from your network. Please wait a minute and try again."
        }))
        sys.exit(1)
