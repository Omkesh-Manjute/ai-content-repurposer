import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers";

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
  console.log("--- RAW AI RESPONSE START ---");
  console.log(raw);
  console.log("--- RAW AI RESPONSE END ---");

  const sections: Record<string, string> = {
    notes: "",
    captions: "",
    reel: "",
    highlights: ""
  };

  const lines = raw.split('\n');
  let currentKey: keyof typeof sections | null = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const upper = trimmed.toUpperCase();
    
    // Check for section transitions (Robust Multi-language & number prefix detection)
    if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:SMART\s*)?(?:NOTES?|SUMMARY|OVERVIEW|नोट)[*#\s\]:]*$/i.test(trimmed) || /^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:SMART\s*)?(?:NOTES?|SUMMARY|OVERVIEW|नोट)[:\s\-]+(?!\s)/i.test(trimmed)) {
      currentKey = "notes";
      continue;
    } else if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:CAPTIONS?|SOCIAL|POSTS|कैप्शन)[*#\s\]:]*$/i.test(trimmed) || /^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:CAPTIONS?|SOCIAL|POSTS|कैप्शन)[:\s\-]+(?!\s)/i.test(trimmed)) {
      currentKey = "captions";
      continue;
    } else if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:REEL\s*SCRIPT|शीर्षक|Smar)[*#\s\]:]*$/i.test(trimmed) || /REEL\s*SCRIPT/i.test(upper)) {
      currentKey = "reel";
      continue;
    } else if (/^(?:\d+[\.\)]\s*)?[#*\-\s\[]*?(?:HIGHLIGHTS?|CLIPS|मुख्य|वीडियो)[*#\s\]:]*$/i.test(trimmed) || /HIGHLIGHTS|CLIPS/i.test(upper)) {
      currentKey = "highlights";
      continue;
    }

    if (currentKey) {
      sections[currentKey] += line + "\n";
    }
  }

  // Fallback: If no markers were found at all, try to find them using regex on the whole block
  if (!sections.notes && !sections.captions && !sections.reel) {
    const headerPrefix = `(?:^|\\n)(?:\\s*\\d+[\\.\\)]\\s*)?[#*\\s]*`;
    
    const notesMatch = raw.match(new RegExp(`${headerPrefix}(?:SMART\\s*)?NOTES?[*#\\s:]*\\s*([\\s\\S]*?)(?=${headerPrefix}(?:CAPTIONS?|REEL\\s*SCRIPT|HIGHLIGHTS?)[*#\\s:]*|$)`, 'i'));
    if (notesMatch) sections.notes = notesMatch[1];
    
    const captionsMatch = raw.match(new RegExp(`${headerPrefix}CAPTIONS?[*#\\s:]*\\s*([\\s\\S]*?)(?=${headerPrefix}(?:(?:SMART\\s*)?NOTES?|REEL\\s*SCRIPT|HIGHLIGHTS?)[*#\\s:]*|$)`, 'i'));
    if (captionsMatch) sections.captions = captionsMatch[1];

    const reelMatch = raw.match(new RegExp(`${headerPrefix}REEL\\s*SCRIPT[*#\\s:]*\\s*([\\s\\S]*?)(?=${headerPrefix}(?:(?:SMART\\s*)?NOTES?|CAPTIONS?|HIGHLIGHTS?)[*#\\s:]*|$)`, 'i'));
    if (reelMatch) sections.reel = reelMatch[1];

    const highlightsMatch = raw.match(new RegExp(`${headerPrefix}HIGHLIGHTS?[*#\\s:]*\\s*([\\s\\S]*?)(?=${headerPrefix}(?:(?:SMART\\s*)?NOTES?|CAPTIONS?|REEL\\s*SCRIPT)[*#\\s:]*|$)`, 'i'));
    if (highlightsMatch) sections.highlights = highlightsMatch[1];
  }

  // Parse sections into structured data
  let notes = sections.notes.trim();

  let captions: string[] = sections.captions
    .split(/\n/)
    .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^\*\*(.*?)\*\*/, "$1").trim())
    .filter(l => l.length > 5);

  let hook = "", reelContent = "", cta = "";
  const r = sections.reel;
  hook = r.match(/\bHook\b[^:]*:\s*(.*?)(?=\bContent\b[^:]*:|\bBody\b[^:]*:|\bCTA\b[^:]*:|$)/is)?.[1]?.trim() || 
         r.split(/\n/)[0]?.replace(/.*Hook[^:]*:\s*/i, "")?.trim() || "";
  reelContent = r.match(/\b(?:Content|Body)\b[^:]*:\s*(.*?)(?=\bCTA\b[^:]*:|$)/is)?.[1]?.trim() || "";
  cta = r.match(/\bCTA\b[^:]*:\s*(.*?)(?=$)/is)?.[1]?.trim() || "";

  const highlights: any[] = [];
  const hText = sections.highlights;
  if (hText) {
    const clipBlocks = hText.split(/(?:^|\n)(?:\d+[\.\)]\s*)?[#*\s]*CLIP[*#\s:]*\s*/i).filter(b => b.trim());
    clipBlocks.forEach(block => {
      let title = block.split(/\n/)[0]?.trim() || "Clip";
      title = title.replace(/^\*\*(.*?)\*\*.*$/, '$1');
      
      const timeMatch = block.match(/TIME:.*?(\d{1,2}:?\d{0,2})\s*[-–]\s*(\d{1,2}:?\d{0,2})/i);
      const reasonMatch = block.match(/REASON:\s*([\s\S]*?)$/is);
      
      if (timeMatch) {
        const parseToSeconds = (ts: string) => {
          if (ts.includes(':')) {
            const parts = ts.split(':');
            return parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0);
          }
          return parseInt(ts) || 0;
        };
        const start = parseToSeconds(timeMatch[1]);
        const end = parseToSeconds(timeMatch[2]);
        if (start >= 0 && end > start) {
          highlights.push({ title, start, end, reason: reasonMatch?.[1]?.trim() || "" });
        }
      }
    });
  }

  // FINAL ULTRA-FALLBACK: If everything is empty (model ignored formatting), put everything in notes
  if (!notes && captions.length === 0 && !hook && !reelContent) {
    console.log("Ultra-fallback triggered: AI ignored all tags.");
    notes = raw.trim();
  }

  return {
    notes: notes || "AI summary could not be extracted. Please try a different model or video.",
    captions: captions.length ? captions : ["Social captions could not be formatted. Try a more powerful model."],
    reelScript: { 
      hook: hook || "Ready for your next viral moment?", 
      content: reelContent || "Video content summarized and ready for extraction.", 
      cta: cta || "Check the link in bio!" 
    },
    highlights: highlights
  };
}

function buildPrompt(transcript: string, tone: string): string {
  const toneInstruction = {
    engaging: "Use a punchy, viral, and highly engaging tone. Use plenty of emojis and strong hooks.",
    professional: "Use a formal, clean, and professional tone. Avoid excessive emojis and focus on clarity and authority.",
    funny: "Use a humorous, lighthearted, and witty tone. Make it entertaining while still being informative.",
    educational: "Use an informative, clear, and didactic tone. Focus on structured learning and deep insights.",
    minimalist: "Use a direct, concise, and minimalist tone. No fluff, just the essential information."
  }[tone] || "Use a simple, engaging tone.";

  return `Analyze this video transcript and create four sections:
  
  TONE INSTRUCTION: ${toneInstruction}

  CRITICAL: 
  - ALWAYS start each section with the EXACT header below.
  - DO NOT prefix headers with numbers like "1." or "(1)".

Header 1 - NOTES: Create structured notes with headings (use ##) and dots (use •).

Header 2 - CAPTIONS: Create exactly 6 short social media captions.

Header 3 - REEL SCRIPT: Create a viral reel script with Hook, Content, and CTA sections.

Header 4 - HIGHLIGHTS: Identify the TOP 5-10 most viral and engaging moments. For long videos, strive for at least 7 high-quality highlights. 
Every highlight MUST be between 30 and 90 seconds.
Return EXACTLY in this format for EACH highlight:
CLIP: [Title]
TIME: [Start-End] (in seconds)
REASON: [Why it is viral]

Return in this EXACT structure:

NOTES:
[structured notes]

CAPTIONS:
1. [caption]
...

REEL SCRIPT:
Hook: [hook]
Content: [content]
CTA: [cta]

HIGHLIGHTS:
CLIP: [title]
TIME: [start-end]
REASON: [reason]

TRANSCRIPT:
${transcript}`;
}

// ─── Provider Engines ─────────────────────────────────

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

async function callOpenAICompat(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl: string,
  referer?: string
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (referer) {
    headers["HTTP-Referer"] = referer;
    headers["X-Title"] = "AI Content Repurposer";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Failed to parse API response: ${res.statusText}`);
  }

  if (!res.ok || data.error) {
    const errorBody = data.error || data;
    const msg = errorBody.message || errorBody.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    
    console.error(`AI API Error (${model}):`, JSON.stringify(data, null, 2));

    if (res.status === 401 || String(errorBody.code) === "401") {
      throw new Error("Invalid API key. Please check your key and try again.");
    }
    if (res.status === 404 || msg.toLowerCase().includes("not a valid model") || msg.toLowerCase().includes("model not found")) {
      throw new Error(`Model not found: "${model}". Please select a different model.`);
    }
    if (res.status === 429 || msg.toLowerCase().includes("rate limit")) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    if (res.status === 402 || msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("credits")) {
      throw new Error("Insufficient credits or balance. Please top up your account or use a free model.");
    }
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("Empty AI Response Data:", JSON.stringify(data, null, 2));
    throw new Error("The model returned an empty response. This can happen with free models during high traffic. Please try again or use a different model.");
  }

  return content;
}


async function generateWithProvider(
  providerId: ProviderId,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const provider = getProvider(providerId);

  switch (providerId) {
    case "gemini":
      return callGemini(apiKey, model, prompt);

    case "groq":
      return callOpenAICompat(apiKey, model, prompt, "https://api.groq.com/openai/v1");

    case "openrouter":
      return callOpenAICompat(
        apiKey,
        model,
        prompt,
        "https://openrouter.ai/api/v1",
        "https://ai-repurposer.app"
      );

    case "nvidia":
      return callOpenAICompat(
        apiKey,
        model,
        prompt,
        provider.baseUrl || "https://integrate.api.nvidia.com/v1"
      );

    case "openai":
      return callOpenAICompat(apiKey, model, prompt, "https://api.openai.com/v1");

    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

// ─── Main Route Handler ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, apiKey, provider = "gemini", model, tone = "engaging" } = await req.json();

    if (!url || !apiKey) {
      return NextResponse.json(
        { error: "YouTube URL and API key are required." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Please paste a valid YouTube video link." },
        { status: 400 }
      );
    }

    // Get provider config + resolve model
    const providerConfig = getProvider(provider as ProviderId);
    const resolvedModel = model || providerConfig.models[0].id;

    // Step 1: Fetch transcript using Python (most reliable)
    let transcript = "";
    let rawItems: any[] = [];
    
    console.log("Starting transcript extraction for video:", videoId);

    // PRIMARY METHOD: Python youtube-transcript-api (gold standard, most reliable)
    try {
      console.log("Trying Python transcript.py...");
      const safeUrl = url.replace(/"/g, '').replace(/&/g, '^&');
      const { stdout } = await execAsync(
        `python transcript.py "${safeUrl}"`,
        { timeout: 60000 }
      );
      const result = JSON.parse(stdout);
      if (result.status === "success" && result.transcript && result.transcript.length > 0) {
        rawItems = result.transcript;
        console.log(`Python transcript OK! Got ${rawItems.length} items.`);
      } else {
        console.warn("Python transcript returned empty:", result.message);
      }
    } catch (e) {
      console.warn("Python transcript failed:", e);
    }

    // FALLBACK: Node.js youtube-transcript package
    if (!rawItems || rawItems.length === 0) {
      console.log("Python failed, trying Node.js youtube-transcript fallback...");
      try {
        const result = await Promise.race([
          YoutubeTranscript.fetchTranscript(videoId),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
        ]);
        if (result && result.length > 0) {
          rawItems = result;
          console.log("Node.js fallback succeeded!");
        }
      } catch (e) {
        console.warn("Node.js fallback also failed:", e);
      }
    }

    if (rawItems && rawItems.length > 0) {
      // Format with timestamps: [00:15] text...
      transcript = rawItems.map((i) => {
        const mins = Math.floor((i.offset || 0) / 1000 / 60);
        const secs = Math.floor(((i.offset || 0) / 1000) % 60);
        const timeStr = `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
        return `${timeStr} ${i.text}`;
      }).join(" ").replace(/\s+/g, " ").trim();
    }

    if (!transcript) {
      return NextResponse.json(
        { 
          error: "Could not extract transcript. YouTube may be temporarily blocking requests. Please wait 1-2 minutes and try again, or try a different video.",
          details: "This can happen if: (1) The video has no captions/CC, (2) The video is private/restricted, (3) YouTube is rate-limiting requests from your network. Waiting a minute usually fixes it."
        },
        { status: 422 }
      );
    }

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { error: "Transcript too short or empty. Try a different video." },
        { status: 422 }
      );
    }

    // Limit to ~2500 words to massively speed up AI processing time (reduces waiting time for user)
    const words = transcript.split(" ");
    const limitedTranscript = words.length > 2500
      ? words.slice(0, 2500).join(" ") + "..."
      : transcript;

    // Step 2: AI Generation
    const prompt = buildPrompt(limitedTranscript, tone);
    const rawText = await generateWithProvider(
      provider as ProviderId,
      apiKey,
      resolvedModel,
      prompt
    );

    const parsed = parseAIResponse(rawText);

    return NextResponse.json({
      ...parsed,
      videoId,
      providerUsed: providerConfig.name,
      modelUsed: resolvedModel,
    });

  } catch (err: unknown) {
    console.error("API Error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred";

    if (message.includes("API_KEY_INVALID") || message.includes("invalid_api_key") || message.toLowerCase().includes("api key")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your key and try again." },
        { status: 401 }
      );
    }
    if (message.includes("QUOTA") || message.includes("quota") || message.includes("rate_limit") || message.includes("429")) {
      return NextResponse.json(
        { error: "API quota or rate limit exceeded. Please wait and try again." },
        { status: 429 }
      );
    }
    if (message.includes("model") && message.includes("not found")) {
      return NextResponse.json(
        { error: `Model not found. Please select a different model. (${message})` },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
