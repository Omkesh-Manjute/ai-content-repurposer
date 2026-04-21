import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  for (const line of lines) {
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
      // 1. YouTube Transcript Package (Standard)
      try {
        const res = await YoutubeTranscript.fetchTranscript(vId);
        if (res?.length) return res;
      } catch {}

      // 2. InnerTube API - Android Client (Highly Resilient)
      try {
        const androidRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/19.29.1 (iPhone16,2; iOS 17_5_1)" },
          body: JSON.stringify({
            context: { client: { clientName: "ANDROID", clientVersion: "19.29.1" } },
            videoId: vId
          })
        });
        const player = await androidRes.json();
        const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks && tracks.length > 0) {
          const track = tracks.find((t: any) => t.languageCode === 'en') || tracks[0];
          const transcriptJson = await (await fetch(track.baseUrl + "&fmt=json3")).json();
          return transcriptJson.events
            ?.filter((e: any) => e.segs)
            .map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join(""),
              offset: e.tStartMs
            }));
        }
      } catch {}

      // 3. Piped APIs Fallback (Global Proxies)
      const pipedInstances = [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.asia",
        "https://piped-api.garudalinux.org",
        "https://pipedapi.colbybros.online"
      ];

      for (const instance of pipedInstances) {
        try {
          const res = await fetch(`${instance}/streams/${vId}`, { next: { revalidate: 60 } });
          const streamData = await res.json();
          const subtitle = streamData.subtitles?.find((s: any) => s.code.startsWith("en")) || streamData.subtitles?.[0];
          if (subtitle?.url) {
            const vttText = await (await fetch(subtitle.url)).text();
            return vttText.split("\n\n")
              .slice(1)
              .map(block => {
                const parts = block.split("\n");
                return { text: parts.slice(1).join(" "), offset: 0 };
              })
              .filter(i => i.text.length > 2);
          }
        } catch {}
      }

      return null;
    }

    const items = await tryFetchTranscript(videoId);
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Could not extract transcript. YouTube is blocking the request or the video has no captions." }, { status: 422 });
    }

    const fullTranscript = items.map(i => i.text).join(" ").replace(/\s+/g, " ");

    if (!useAI || !apiKey) {
      return NextResponse.json({ transcript: fullTranscript, videoId });
    }

    const prompt = buildPrompt(fullTranscript.slice(0, 10000), tone);
    const rawAiResponse = await generateWithProvider(provider as ProviderId, apiKey, model, prompt);
    const parsed = parseAIResponse(rawAiResponse);

    return NextResponse.json({ ...parsed, videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
