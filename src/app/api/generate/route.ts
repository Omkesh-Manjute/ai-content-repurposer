import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

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
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL;
  
  if (pythonBackendUrl) {
    // Try up to 2 times to handle Render cold starts
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Fetching from Python backend...`);
        const res = await fetch(`${pythonBackendUrl.replace(/\/$/, "")}/transcript/${vId}`, {
          // Longer timeout for the first attempt to allow Render to wake up
          signal: AbortSignal.timeout(attempt === 1 ? 50000 : 15000)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) return data.transcript;
        }
      } catch (e) {
        console.error(`Attempt ${attempt} failed:`, e);
        // Wait a bit before second attempt if first one timed out
        if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // Fallback to existing Node strategies
  const extractFromPlayerResponse = (data: any) => {
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks?.length) return tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    return null;
  };

  const fetchCaptionData = async (baseUrl: string) => {
    const res = await fetch(baseUrl + "&fmt=json3");
    const data = await res.json();
    return data.events?.filter((e: any) => e.segs).map((e: any) => ({
      text: e.segs.map((s: any) => s.utf8).join(""),
      offset: e.tStartMs
    }));
  };

  // Strategy 1: Piped API
  const pipedInstances = ["https://pipedapi.kavin.rocks", "https://pipedapi.tokhmi.xyz"];
  for (const api of pipedInstances) {
    try {
      const res = await fetch(`${api}/streams/${vId}`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const sub = data.subtitles?.find((s: any) => s.code === "en") || data.subtitles?.[0];
      if (sub?.url) {
        const vttRes = await fetch(sub.url);
        const vtt = await vttRes.text();
        return vtt.split("\n\n").filter(b => b.includes("-->")).map(b => ({
          text: b.split("\n").slice(1).join(" ").replace(/<[^>]*>/g, "").trim(),
          offset: 0
        })).filter(i => i.text.length > 0);
      }
    } catch (e) {}
  }

  return null;
}


export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, model = "meta-llama/llama-3.3-70b-instruct:free", tone = "Hinglish", transcript } = await req.json();
    const videoId = extractVideoId(url?.trim());

    if (!videoId && !transcript) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    
    let fullTranscript = transcript;
    
    if (!fullTranscript) {
      const items = await tryFetchTranscript(videoId!);
      if (!items?.length) {
        return NextResponse.json({ 
          error: "YouTube is blocking our server. Trying secondary extraction...", 
          isBlockError: true 
        }, { status: 422 });
      }
      fullTranscript = items.map((i: TranscriptItem) => i.text).join(" ").replace(/\s+/g, " ");
    }
    
    // OpenRouter Only
    const prompt = `You are an AI Content Repurposer. Convert this transcript into structured Hinglish content (Summary, Notes, 3 Reels Scripts, 10 Hooks, 5 Titles, 3 Captions, Tags). 
    
    TRANSCRIPT: ${fullTranscript.slice(0, 10000)}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://collega.ai", // Required by OpenRouter for some free models
        "X-Title": "Collega AI"
      },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "OpenRouter Error");

    const aiText = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ ...parseAIResponse(aiText), videoId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
