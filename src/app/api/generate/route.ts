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
  const sections: Record<string, string> = { 
    summary: "", notes: "", reels: "", hooks: "", titles: "", captions: "", keywords: "" 
  };
  const lines = raw.split("\n");
  let currentKey: keyof typeof sections | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    if (/SUMMARY|सारांश/i.test(upper) && (trimmed.includes("📌") || trimmed.includes("1."))) {
      currentKey = "summary"; continue;
    } else if (/NOTES|नोट्स/i.test(upper) && (trimmed.includes("🧠") || trimmed.includes("2."))) {
      currentKey = "notes"; continue;
    } else if (/REELS|SHORTS|रील्स/i.test(upper) && (trimmed.includes("🎯") || trimmed.includes("3."))) {
      currentKey = "reels"; continue;
    } else if (/HOOKS|हुक्स/i.test(upper) && (trimmed.includes("🔥") || trimmed.includes("4."))) {
      currentKey = "hooks"; continue;
    } else if (/TITLES|शीर्षक/i.test(upper) && (trimmed.includes("🏷️") || trimmed.includes("5."))) {
      currentKey = "titles"; continue;
    } else if (/CAPTIONS|कैप्शन/i.test(upper) && (trimmed.includes("📢") || trimmed.includes("6."))) {
      currentKey = "captions"; continue;
    } else if (/KEYWORDS|TAGS|कीवर्ड/i.test(upper) && (trimmed.includes("🔑") || trimmed.includes("7."))) {
      currentKey = "keywords"; continue;
    }
    if (currentKey) sections[currentKey] += line + "\n";
  }

  const reelScripts = sections.reels.split(/VERSION|वर्जन/i)
    .filter(s => s.trim().length > 10)
    .map(s => ({
      hook: s.match(/Hook:?\s*(.*?)(?=\s*Main|Ending|CTA|\n|$)/is)?.[1]?.trim() || "",
      content: s.match(/Main:?\s*(.*?)(?=\s*Ending|CTA|\n|$)/is)?.[1]?.trim() || "",
      cta: s.match(/Ending:?\s*(.*?)(?=\n|$)/is)?.[1]?.trim() || ""
    }));

  return {
    summary: sections.summary.trim(),
    notes: sections.notes.trim(),
    reelScripts,
    viralHooks: sections.hooks.trim().split("\n").filter(l => l.length > 5).slice(0, 10),
    titles: sections.titles.trim().split("\n").filter(l => l.length > 5).slice(0, 5),
    captions: sections.captions.trim().split("\n\n").filter(l => l.length > 10).slice(0, 3),
    keywords: sections.keywords.trim(),
  };
}

async function tryFetchTranscript(vId: string): Promise<TranscriptItem[] | null> {
  console.log(`Attempting transcript for: ${vId}`);
  
  // Strategy 1: youtube-transcript package
  try {
    const res = await YoutubeTranscript.fetchTranscript(vId);
    if (res?.length) return res;
  } catch (e) { console.log("Strategy 1 failed"); }

  // Strategy 2: Direct InnerTube (Desktop) - simulating a browser session
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${vId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" }
    });
    const html = await res.text();
    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (match) {
      const tracks = JSON.parse(match[1]);
      const track = tracks.find((t: any) => t.languageCode === 'en' || t.languageCode === 'hi') || tracks[0];
      if (track?.baseUrl) {
        const trRes = await fetch(track.baseUrl + "&fmt=json3");
        const trData = await trRes.json() as any;
        return trData.events?.filter((e: any) => e.segs).map((e: any) => ({
          text: e.segs.map((s: any) => s.utf8).join(""),
          offset: e.tStartMs
        }));
      }
    }
  } catch (e) { console.log("Strategy 2 failed"); }

  // Strategy 3: Multi-Service Fallback (Piped + Invidious)
  const services = [
    `https://api.piped.asia/streams/${vId}`,
    `https://pipedapi.kavin.rocks/streams/${vId}`,
    `https://yewtu.be/api/v1/videos/${vId}?fields=captions`,
    `https://inv.tux.rs/api/v1/videos/${vId}?fields=captions`
  ];

  for (const url of services) {
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      const data = await res.json() as any;
      
      // Piped format
      if (data.subtitles) {
        const sub = data.subtitles.find((s: any) => s.code.startsWith('en')) || data.subtitles[0];
        if (sub?.url) {
          const vtt = await (await fetch(sub.url)).text();
          return vtt.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
        }
      }
      // Invidious format
      if (data.captions) {
        const cap = data.captions.find((c: any) => c.label.includes("English")) || data.captions[0];
        if (cap?.url) {
          const baseUrl = new URL(url).origin;
          const vtt = await (await fetch(baseUrl + cap.url)).text();
          return vtt.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
        }
      }
    } catch (e) { continue; }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, provider = "openai", model = "gpt-4o", tone = "Hinglish", useAI = true } = await req.json();
    const videoId = extractVideoId(url?.trim());
    
    if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL. Please check the video link." }, { status: 400 });

    const items = await tryFetchTranscript(videoId);
    if (!items?.length) {
      return NextResponse.json({ error: "YouTube is blocking our requests. This happens sometimes with Vercel IPs. Please try again in 5 minutes or use a different video." }, { status: 422 });
    }

    const fullTranscript = items.map((i: TranscriptItem) => i.text).join(" ").replace(/\s+/g, " ");

    if (!useAI || !apiKey) {
      return NextResponse.json({ transcript: fullTranscript, videoId });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Convert this transcript to Hinglish summary, notes, 3 reel scripts, 10 hooks, 5 titles, 3 captions, and tags. 
Transcript: ${fullTranscript.slice(0, 10000)}`;

    let responseText = "";
    if (provider === "gemini") {
      const result = await genAI.getGenerativeModel({ model }).generateContent(prompt);
      responseText = result.response.text();
    } else {
      const baseUrl = provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json() as any;
      responseText = data.choices?.[0]?.message?.content || "";
    }

    const parsed = parseAIResponse(responseText);
    return NextResponse.json({ ...parsed, videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
