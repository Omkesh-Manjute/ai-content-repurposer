import sys
import os
import json
import time
from yt_dlp import YoutubeDL

try:
    from moviepy import VideoFileClip

    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False

EXPORTS_DIR = os.path.join(os.getcwd(), "public", "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)


def get_video_info(video_url):
    """Fetch video info with retries + cookies"""

    base_opts = {
        "format": "best[height<=720]/best",
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
        "format": "best[height<=720]/best",
        "outtmpl": temp_path,
        "quiet": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }

    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])


def clip_video(video_url, start_time, end_time, output_filename):
    if not MOVIEPY_AVAILABLE:
        raise Exception("MoviePy not installed → pip install moviepy")

    duration = end_time - start_time
    if duration <= 0:
        raise Exception("End time must be greater than start time")
    if duration > 300:
        raise Exception("Max clip length = 5 min")

    print("Fetching video info...", file=sys.stderr)
    info = get_video_info(video_url)

    stream_url = info.get("url")

    output_path = os.path.join(EXPORTS_DIR, output_filename)

    # 🔥 TRY STREAM FIRST
    try:
        print("Trying direct stream...", file=sys.stderr)
        with VideoFileClip(stream_url) as video:
            subclip = video.subclipped(start_time, end_time)
            subclip.write_videofile(
                output_path, codec="libx264", audio_codec="aac", fps=24, logger=None
            )
        return output_path

    except Exception:
        print("Stream failed → downloading fallback...", file=sys.stderr)

    # 🔥 FALLBACK DOWNLOAD
    temp_file = os.path.join(EXPORTS_DIR, f"temp_{int(time.time())}.mp4")

    download_video(video_url, temp_file)

    with VideoFileClip(temp_file) as video:
        subclip = video.subclipped(start_time, end_time)
        subclip.write_videofile(
            output_path, codec="libx264", audio_codec="aac", fps=24, logger=None
        )

    os.remove(temp_file)

    return output_path


def main():
    if len(sys.argv) < 2:
        print("Usage: python clipper.py '<json>'", file=sys.stderr)
        sys.exit(1)

    try:
        config = json.loads(sys.argv[1])

        url = config.get("url")
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
