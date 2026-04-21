import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers";

// ─── Helpers ──────────────────────────────────────────
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/?|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseAIResponse(raw: string) {
  const sections: Record<string, string> = { notes: "", captions: "", reel: "", highlights: "" };
  const lines = raw.split("\n");
  let currentKey: keyof typeof sections | null = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:SMART\s*)?(?:NOTES?|SUMMARY|नोट)/i.test(trimmed)) {
      currentKey = "notes"; continue;
    } else if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:CAPTIONS?|SOCIAL|POSTS|कैप्शन)/i.test(trimmed)) {
      currentKey = "captions"; continue;
    } else if (/REEL\s*SCRIPT|शीर्षक/i.test(upper)) {
      currentKey = "reel"; continue;
    } else if (/HIGHLIGHTS|CLIPS|मुख्य|वीडियो/i.test(upper)) {
      currentKey = "highlights"; continue;
    }
    if (currentKey) sections[currentKey] += line + "\n";
  }

  let captions: string[] = sections.captions.split("\n")
    .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^\*\*(.*?)\*\*/, "$1").trim())
    .filter(l => l.length > 5);

  const r = sections.reel;
  const hook = r.match(/\bHook\b[^:]*:\s*(.*?)(?=\bContent\b[^:]*:|\bBody\b[^:]*:|\bCTA\b[^:]*:|$)/is)?.[1]?.trim() || "";
  const reelContent = r.match(/\b(?:Content|Body)\b[^:]*:\s*(.*?)(?=\bCTA\b[^:]*:|$)/is)?.[1]?.trim() || "";
  const cta = r.match(/\bCTA\b[^:]*:\s*(.*?)(?=$)/is)?.[1]?.trim() || "";

  const highlights: any[] = [];
  sections.highlights.split(/CLIP[*#\s:]*/i).filter(b => b.trim()).forEach(block => {
    const timeMatch = block.match(/TIME:.*?(\d{1,2}:?\d{0,2})\s*[-–]\s*(\d{1,2}:?\d{0,2})/i);
    if (timeMatch) highlights.push({ title: block.split("\n")[0].trim(), start: parseInt(timeMatch[1]) || 0, end: parseInt(timeMatch[2]) || 0 });
  });

  return {
    notes: sections.notes.trim() || raw.trim(),
    captions: captions.length ? captions : ["Social captions could not be formatted."],
    reelScript: { hook: hook || "New Viral Script", content: reelContent || "Video summarized.", cta: cta || "Link in bio" },
    highlights
  };
}

function buildPrompt(transcript: string, tone: string): string {
  return `Analyze this video transcript and create four sections: NOTES, CAPTIONS, REEL SCRIPT, and HIGHLIGHTS.
Tone: ${tone}. Start each section with its name.
Transcript:
${transcript}`;
}

async function callOpenAICompat(apiKey: string, model: string, prompt: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateWithProvider(providerId: ProviderId, apiKey: string, model: string, prompt: string): Promise<string> {
  if (providerId === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    return (await genAI.getGenerativeModel({ model }).generateContent(prompt)).response.text();
  }
  const baseUrl = providerId === "openai" ? "https://api.openai.com/v1" : providerId === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
  return callOpenAICompat(apiKey, model, prompt, baseUrl);
}

// ─── Main Route Handler ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, provider = "openai", model = "gpt-4o", tone = "engaging", useAI = true } = await req.json();
    const videoId = extractVideoId(url?.trim());
    if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

    console.log("Processing:", videoId);

    async function tryFetchTranscript(vId: string) {
      // 1. Package Fallback
      try {
        const res = await YoutubeTranscript.fetchTranscript(vId);
        if (res?.length) return res;
      } catch {}

      // 2. Manual Mobile Fetch (Native Node)
      try {
        const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; iOS 17_5_1)" },
          body: JSON.stringify({ context: { client: { clientName: "IOS", clientVersion: "19.29.1" } }, videoId: vId })
        });
        const data = await res.json();
        const trackUrl = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl;
        if (trackUrl) {
          const tRes = await (await fetch(trackUrl + "&fmt=json3")).json();
          return tRes.events?.filter((e: any) => e.segs).map((e: any) => ({ text: e.segs.map((s: any) => s.utf8).join(""), offset: e.tStartMs }));
        }
      } catch {}

      // 3. Piped APIs
      for (const api of ["https://pipedapi.kavin.rocks", "https://api.piped.asia"]) {
        try {
          const data = await (await fetch(`${api}/streams/${vId}`)).json();
          const track = data.subtitles?.find((s: any) => s.code.startsWith("en"));
          if (track?.url) {
            const text = await (await fetch(track.url)).text();
            return text.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
          }
        } catch {}
      }
      return null;
    }

    const items = await tryFetchTranscript(videoId);
    if (!items?.length) return NextResponse.json({ error: "Transcript blocked or unavailable" }, { status: 422 });

    const fullTranscript = items.map(i => i.text).join(" ").replace(/\s+/g, " ");

    // Standard Response if useAI is false
    if (!useAI || !apiKey) {
      return NextResponse.json({ transcript: fullTranscript, videoId });
    }

    // AI Processing
    const prompt = buildPrompt(fullTranscript.slice(0, 10000), tone);
    const rawAiResponse = await generateWithProvider(provider as ProviderId, apiKey, model, prompt);
    const parsed = parseAIResponse(rawAiResponse);

    return NextResponse.json({ ...parsed, videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
