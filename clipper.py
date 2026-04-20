import sys
import os
import json
import time
import subprocess
import requests
from yt_dlp import YoutubeDL

EXPORTS_DIR = os.path.join(os.getcwd(), "public", "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)


def get_video_info(video_url):
    """Fetch video info with retries + cookies"""

    base_opts = {
        # Prefer 1080p MP4 muxed streams if available for high quality + fast streaming
        "format": "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
        "quiet": True,
        "no_warnings": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }

    # Try normal
    try:
        with YoutubeDL(base_opts) as ydl:
            return ydl.extract_info(video_url, download=False)
    except Exception:
        pass

    # Try with cookies
    for browser in ["chrome", "edge", "brave", "firefox"]:
        try:
            opts = dict(base_opts)
            opts["cookiesfrombrowser"] = (browser,)
            with YoutubeDL(opts) as ydl:
                return ydl.extract_info(video_url, download=False)
        except Exception:
            continue

    raise Exception("YouTube access blocked (bot protection)")


def download_video(video_url, temp_path):
    """Fallback: download full video if stream fails"""

    ydl_opts = {
        "format": "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
        "outtmpl": temp_path,
        "quiet": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }

    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])


def clip_video(video_url, start_time, end_time, output_filename):
    duration = end_time - start_time
    if duration <= 0:
        raise Exception("End time must be greater than start time")
    if duration > 300:
        raise Exception("Max clip length = 5 min")

    output_path = os.path.join(EXPORTS_DIR, output_filename)
    
    # Format timestamps for yt-dlp (*HH:MM:SS.ms)
    def format_time(seconds):
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"

    start_str = format_time(start_time)
    end_str = format_time(end_time)

    print(f"Downloading HQ clip: {start_str} to {end_str}...", file=sys.stderr)

    # 🚀 ULTRA-STABLE HIGH-SPEED COMMAND
    # Removing --force-keyframes-at-cuts to prevent extremely slow re-encoding! 
    # This makes the clipping almost instantaneous (using stream copy).
    cmd = [
        "python", "-m", "yt_dlp",
        "--no-warnings",
        "--no-playlist",
        "--no-check-certificate",
        "--no-mtime",
        "--extractor-args", "youtube:player_client=ios,android,web",
        "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
        "-S", "ext:mp4:m4a",
        "--download-sections", f"*{start_str}-{end_str}",
        "--downloader", "ffmpeg",
        "--downloader-args", "ffmpeg:-c:v copy -c:a copy",
        "-o", output_path,
        video_url
    ]

    # Use a single direct attempt to maximize speed. The iOS/Android player client bypasses most bot protection.
    try:
        print(f"Trying high-speed download...", file=sys.stderr)
        subprocess.run(cmd, check=True, capture_output=True)
        if os.path.exists(output_path):
            return output_path
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode()
        print(f"Attempt failed: {error_msg}", file=sys.stderr)
        
        # Fallback to standard web client if mobile clients fail
        print(f"Trying fallback web client with chrome cookies...", file=sys.stderr)
        fallback_cmd = [c for c in cmd if c != "--extractor-args" and c != "youtube:player_client=ios,android,web"]
        fallback_cmd.extend(["--cookies-from-browser", "chrome"])
        try:
            subprocess.run(fallback_cmd, check=True, capture_output=True)
            if os.path.exists(output_path):
                return output_path
        except subprocess.CalledProcessError as e2:
            raise Exception(f"Video download failed: {e2.stderr.decode()}")

    raise Exception("Failed to generate High Quality clip. YouTube might be blocking the request.")


def get_transcript(video_url):
    """Fetch transcript using yt-dlp for maximum robustness"""
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

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
            # Find the best subtitle track
            subs = info.get("requested_subtitles") or info.get("subtitles") or info.get("automatic_captions")
            if not subs:
                raise Exception("No transcripts found for this video")

            # Prioritize English, then Hindi
            target_lang = None
            for lang in ["en", "en-US", "hi"]:
                if lang in subs:
                    target_lang = lang
                    break
            
            if not target_lang:
                target_lang = list(subs.keys())[0] # Take first available

            # Get the URL (prefer json3 format if possible for easy parsing, then srv1)
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

            # Fetch the subtitle content with timeout
            resp = requests.get(sub_url, timeout=15)
            resp.raise_for_status()

            # Parse transcript based on format
            if "json3" in sub_url:
                data = resp.json()
                items = []
                for event in data.get("events", []):
                    if "segs" in event:
                        text = "".join([s.get("utf8", "") for s in event["segs"]]).strip()
                        if text:
                            items.append({"text": text, "offset": event.get("tStartMs", 0)})
                return items
            else:
                # Basic fallback for non-json formats (very simplified)
                return [{"text": resp.text, "offset": 0}]

    except Exception as e:
        raise Exception(f"Transcript extraction failed: {str(e)}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python clipper.py '<json>' OR python clipper.py transcript <url>", file=sys.stderr)
        sys.exit(1)

    try:
        # Check if first arg is 'transcript' (positional mode)
        if sys.argv[1] == "transcript" and len(sys.argv) > 2:
            url = sys.argv[2]
            items = get_transcript(url)
            print(json.dumps({"status": "success", "transcript": items}))
            return

        # Otherwise assume JSON mode
        try:
            config = json.loads(sys.argv[1])
        except json.JSONDecodeError:
            # Try to fix Windows shell escaping if possible, or just fail
            raise Exception(f"Invalid JSON input: {sys.argv[1]}")

        mode = config.get("mode", "clip")
        url = config.get("url")
        
        if mode == "transcript":
            items = get_transcript(url)
            print(json.dumps({"status": "success", "transcript": items}))
            return

        start = float(config.get("start"))
        end = float(config.get("end"))
        filename = config.get("filename", f"clip_{int(time.time())}.mp4")

        result = clip_video(url, start, end, filename)

        print(
            json.dumps(
                {
                    "status": "success",
                    "file": os.path.basename(result),
                    "path": f"/exports/{os.path.basename(result)}",
                }
            )
        )

    except Exception as e:
        msg = str(e)

        if "bot" in msg.lower():
            msg = "YouTube blocked request → Use cookies or wait"

        print(json.dumps({"status": "error", "message": msg}), file=sys.stderr)

        sys.exit(1)


if __name__ == "__main__":
    main()

