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
  const sections: Record<string, string> = { 
    summary: "", 
    notes: "", 
    reels: "", 
    hooks: "", 
    titles: "", 
    captions: "", 
    keywords: "" 
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
    } else if (/REELS|SHORTS|SCRIPT|रील्स/i.test(upper) && (trimmed.includes("🎯") || trimmed.includes("3."))) {
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

  const reelScripts = sections.reels.split(/VERSION\s*\d+|वर्जन\s*\d+/i)
    .filter(s => s.trim().length > 20)
    .map(s => {
      const hook = s.match(/Hook:?\s*(.*?)(?=\s*(?:Main|Content|Body|Ending|CTA|$)|\n)/is)?.[1]?.trim() || "";
      const content = s.match(/(?:Main|Content|Body):?\s*(.*?)(?=\s*(?:Ending|CTA|$)|\n)/is)?.[1]?.trim() || "";
      const cta = s.match(/(?:Ending|CTA):?\s*(.*?)(?=$|\n)/is)?.[1]?.trim() || "";
      return { hook, content, cta };
    });

  return {
    summary: sections.summary.trim(),
    notes: sections.notes.trim(),
    reelScripts: reelScripts.length ? reelScripts : [{ hook: "Catchy Hook", content: sections.reels.trim(), cta: "Follow for more" }],
    viralHooks: sections.hooks.trim().split("\n").filter(l => l.length > 5).slice(0, 10),
    titles: sections.titles.trim().split("\n").filter(l => l.length > 5).slice(0, 5),
    captions: sections.captions.trim().split("\n\n").filter(l => l.length > 10).slice(0, 3),
    keywords: sections.keywords.trim(),
  };
}

function buildPrompt(transcript: string, tone: string): string {
  return `You are an AI Content Repurposer.

INPUT:
YouTube video transcript: "${transcript}"

YOUR TASK:
Convert the transcript into structured, high-quality content in a "${tone}" tone.

OUTPUT FORMAT:

1. 📌 SHORT SUMMARY (5–6 lines)
2. 🧠 DETAILED NOTES
3. 🎯 REELS / SHORTS SCRIPT (3 versions)
Each MUST include: VERSION, Hook, Main, Ending.
4. 🔥 VIRAL HOOKS (10)
5. 🏷️ TITLES (5)
6. 📢 CAPTIONS (3)
7. 🔑 KEYWORDS / TAGS

STYLE: Hinglish, Simple, High engagement, No fluff. No mentions of "transcript".`;
}

async function callOpenAICompat(apiKey: string, model: string, prompt: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: "You are a content creator." }, { role: "user", content: prompt }] }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

async function generateWithProvider(providerId: ProviderId, apiKey: string, model: string, prompt: string): Promise<string> {
  if (providerId === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.getGenerativeModel({ model }).generateContent(prompt);
    return result.response.text();
  }
  const baseUrl = providerId === "openai" ? "https://api.openai.com/v1" : providerId === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
  return callOpenAICompat(apiKey, model, prompt, baseUrl);
}

// ─── Main Route Handler ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, provider = "openai", model = "gpt-4o", tone = "Hinglish", useAI = true } = await req.json();
    const videoId = extractVideoId(url?.trim());
    if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

    async function tryFetchTranscript(vId: string): Promise<TranscriptItem[] | null> {
      // 1. youtube-transcript (Standard)
      try {
        const res = await YoutubeTranscript.fetchTranscript(vId);
        if (res?.length) return res;
      } catch {}

      // 2. HTML Scrape (Browser impersonation)
      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${vId}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0" }
        });
        const html = await pageRes.text();
        const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (captionsMatch) {
          const tracks = JSON.parse(captionsMatch[1]);
          const track = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
          if (track?.baseUrl) {
            const transcriptRaw = await (await fetch(track.baseUrl + "&fmt=json3")).json() as any;
            return transcriptRaw.events?.filter((e: any) => e.segs).map((e: any) => ({
              text: e.segs.map((s: any) => s.utf8).join(""),
              offset: e.tStartMs
            }));
          }
        }
      } catch {}

      // 3. Invidious API (Very resilient to blocking)
      const invidiousInstances = ["https://yewtu.be", "https://inv.tux.rs", "https://invidious.snopyta.org"];
      for (const inst of invidiousInstances) {
        try {
          const data = await (await fetch(`${inst}/api/v1/videos/${vId}?fields=captions`)).json() as any;
          const cap = data.captions?.find((c: any) => c.label.includes("English")) || data.captions?.[0];
          if (cap?.url) {
            const vtt = await (await fetch(`${inst}${cap.url}`)).text();
            return vtt.split("\n\n").slice(1).map(b => ({ text: b.split("\n").slice(1).join(" "), offset: 0 }));
          }
        } catch {}
      }
      return null;
    }

    const items = await tryFetchTranscript(videoId);
    if (!items?.length) return NextResponse.json({ error: "Could not extract transcript. YouTube is blocking the request." }, { status: 422 });

    const fullTranscript = items.map((i: TranscriptItem) => i.text).join(" ").replace(/\s+/g, " ");

    if (!useAI || !apiKey) return NextResponse.json({ transcript: fullTranscript, videoId });

    const prompt = buildPrompt(fullTranscript.slice(0, 10000), tone);
    const rawAiResponse = await generateWithProvider(provider as ProviderId, apiKey, model, prompt);
    const parsed = parseAIResponse(rawAiResponse);

    return NextResponse.json({ ...parsed, videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
