import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderId } from "@/lib/providers";

interface TranscriptItem {
  text: string;
  offset: number;
}

// ─── Helpers ──────────────────────────────────────────
function extractVideoId(url: string): string | null {
  if (!url) return null;
  const decodedUrl = decodeURIComponent(url);
  const patterns = [
    /(?:v=|v\/|vi\/|shorts\/|embed\/|youtu.be\/|youtube.com\/user\/[^#]*#([^\/]*?\/)*)\??(?:v=)?([a-zA-Z0-9_-]{11})/,
    /[a-zA-Z0-9_-]{11}/
  ];
  for (const pattern of patterns) {
    const match = decodedUrl.match(pattern);
    if (match) {
      const id = match[2] || match[0];
      if (id.length === 11) return id;
    }
  }
  return null;
}

function parseAIResponse(raw: string) {
  const sections: Record<string, string> = { summary: "", notes: "", reels: "", hooks: "", titles: "", captions: "", keywords: "" };
  const lines = raw.split("\n");
  let currentKey: keyof typeof sections | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();
    if (/SUMMARY|सारांश/i.test(upper) && (trimmed.includes("📌") || trimmed.includes("1."))) { currentKey = "summary"; continue; }
    else if (/NOTES|नोट्स/i.test(upper) && (trimmed.includes("🧠") || trimmed.includes("2."))) { currentKey = "notes"; continue; }
    else if (/REELS|SHORTS|रील्स/i.test(upper) && (trimmed.includes("🎯") || trimmed.includes("3."))) { currentKey = "reels"; continue; }
    else if (/HOOKS|हुक्स/i.test(upper) && (trimmed.includes("🔥") || trimmed.includes("4."))) { currentKey = "hooks"; continue; }
    else if (/TITLES|शीर्षक/i.test(upper) && (trimmed.includes("🏷️") || trimmed.includes("5."))) { currentKey = "titles"; continue; }
    else if (/CAPTIONS|कैप्शन/i.test(upper) && (trimmed.includes("📢") || trimmed.includes("6."))) { currentKey = "captions"; continue; }
    else if (/KEYWORDS|कीवर्ड/i.test(upper) && (trimmed.includes("🔑") || trimmed.includes("7."))) { currentKey = "keywords"; continue; }
    if (currentKey) sections[currentKey] += line + "\n";
  }
  const reelScripts = sections.reels.split(/VERSION|वर्जन/i).filter(s => s.trim().length > 10).map(s => ({
    hook: s.match(/Hook:?\s*(.*?)(?=\s*Main|Ending|CTA|\n|$)/is)?.[1]?.trim() || "",
    content: s.match(/Main:?\s*(.*?)(?=\s*Ending|CTA|\n|$)/is)?.[1]?.trim() || "",
    cta: s.match(/Ending:?\s*(.*?)(?=\n|$)/is)?.[1]?.trim() || ""
  }));
  return {
    summary: sections.summary.trim(), notes: sections.notes.trim(), reelScripts,
    viralHooks: sections.hooks.trim().split("\n").filter(l => l.length > 5).slice(0, 10),
    titles: sections.titles.trim().split("\n").filter(l => l.length > 5).slice(0, 5),
    captions: sections.captions.trim().split("\n\n").filter(l => l.length > 10).slice(0, 3),
    keywords: sections.keywords.trim(),
  };
}

async function tryFetchTranscript(vId: string): Promise<TranscriptItem[] | null> {
  // Strategy 1: youtube-transcript
  try {
    const res = await YoutubeTranscript.fetchTranscript(vId);
    if (res?.length) return res;
  } catch {}

  // Strategy 2: Python-like Scraping
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${vId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      }
    });
    const html = await res.text();
    const cleanHtml = html.split('ytInitialPlayerResponse = ')[1]?.split(';</script>')[0];
    if (cleanHtml) {
      const playerResponse = JSON.parse(cleanHtml);
      const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks?.length) {
        const track = tracks.find((t: any) => t.languageCode === "en" || t.languageCode === "hi") || tracks[0];
        const data = await (await fetch(track.baseUrl + "&fmt=json3")).json();
        return data.events?.filter((e: any) => e.segs).map((e: any) => ({
          text: e.segs.map((s: any) => s.utf8).join(""),
          offset: e.tStartMs
        }));
      }
    }
  } catch {}

  // Strategy 3: Invidious Global network
  const insts = ["https://yewtu.be", "https://inv.tux.rs", "https://invidious.projectsegfau.lt", "https://invidious.sethforprivacy.com"];
  for (const inst of insts) {
    try {
      const data = await (await fetch(`${inst}/api/v1/videos/${vId}?fields=captions`)).json();
      const cap = data.captions?.find((c: any) => c.label.includes("English")) || data.captions?.[0];
      if (cap?.url) {
        const vtt = await (await fetch(`${inst}${cap.url}`)).text();
        return vtt.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
      }
    } catch {}
  }

  // Strategy 4: Piped-link
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${vId}`);
    const data = await res.json();
    const sub = data.subtitles?.find((s: any) => s.code.startsWith("en")) || data.subtitles?.[0];
    if (sub?.url) {
      const vtt = await (await fetch(sub.url)).text();
      return vtt.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
    }
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, provider = "openai", model = "gpt-4o", tone = "Hinglish", useAI = true } = await req.json();
    const videoId = extractVideoId(url?.trim());
    if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

    const items = await tryFetchTranscript(videoId);
    if (!items?.length) {
      return NextResponse.json({ error: "YouTube has temporary blocked your server. Please try again after 2 minutes or use a different video link." }, { status: 422 });
    }

    const fullTranscript = items.map((i: TranscriptItem) => i.text).join(" ").replace(/\s+/g, " ");

    if (!useAI || !apiKey) {
      return NextResponse.json({ transcript: fullTranscript, videoId });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Convert this transcript to Hinglish summary, notes, reel scripts, hooks, titles, and captions: ${fullTranscript.slice(0, 10000)}`;

    let aiText = "";
    if (provider === "gemini") {
      const res = await genAI.getGenerativeModel({ model }).generateContent(prompt);
      aiText = res.response.text();
    } else {
      const baseUrl = provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      aiText = data.choices?.[0]?.message?.content || "";
    }

    return NextResponse.json({ ...parseAIResponse(aiText), videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
