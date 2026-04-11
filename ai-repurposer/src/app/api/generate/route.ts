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
  // Robust parsing using negative lookaheads and optional markdown tokens
  const notesMatch = raw.match(/(?:^|\n)[#*\s]*NOTES?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:CAPTIONS?|REEL\s*SCRIPT|HIGHLIGHTS?)[*#\s:]*|$)/i);
  const captionsMatch = raw.match(/(?:^|\n)[#*\s]*CAPTIONS?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|REEL\s*SCRIPT|HIGHLIGHTS?)[*#\s:]*|$)/i);
  const reelMatch = raw.match(/(?:^|\n)[#*\s]*REEL\s*SCRIPT[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|CAPTIONS?|HIGHLIGHTS?)[*#\s:]*|$)/i);
  const highlightsMatch = raw.match(/(?:^|\n)[#*\s]*HIGHLIGHTS?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|CAPTIONS?|REEL\s*SCRIPT)[*#\s:]*|$)/i);

  const notes = notesMatch?.[1]?.trim() || "Unable to parse notes.";

  let captions: string[] = [];
  if (captionsMatch?.[1]) {
    captions = captionsMatch[1]
      .split(/\n/)
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "")
                   .replace(/^\*\*(.*?)\*\*/, "$1") // Remove bolding if any
                   .trim())
      .filter((l) => l.length > 5);
  }

  let hook = "", reelContent = "", cta = "";
  if (reelMatch?.[1]) {
    const r = reelMatch[1];
    hook = r.match(/\bHook\b[^:]*:\s*(.*?)(?=\bContent\b[^:]*:|\bBody\b[^:]*:|\bCTA\b[^:]*:|\bHook\b[^:]*:|$)/is)?.[1]?.trim() || 
           r.split(/\n/)[0]?.replace(/.*Hook[^:]*:\s*/i, "")?.replace(/^\*\*(.*?)\*\*/, "$1")?.trim() || "";
    reelContent = r.match(/\b(?:Content|Body)\b[^:]*:\s*(.*?)(?=\bCTA\b[^:]*:|\bHook\b[^:]*:|\bContent\b[^:]*:|$)/is)?.[1]?.trim() || "";
    cta = r.match(/\bCTA\b[^:]*:\s*(.*?)(?=\bHook\b[^:]*:|$)/is)?.[1]?.trim() || "";
  }

  const highlights: any[] = [];
  const hText = highlightsMatch?.[1] || "";
  if (hText) {
    // Split by CLIP: but handle potential AI formatting variations
    const clipBlocks = hText.split(/(?:^|\n)[#*\s]*CLIP[*#\s:]*\s*/i).filter(b => b.trim());
    
    clipBlocks.forEach(block => {
      // First line is usually title
      let title = block.split(/\n/)[0]?.trim() || "Clip";
      title = title.replace(/^\*\*(.*?)\*\*.*$/, '$1'); // Extract bolded title correctly
      
      // Match TIME: 123-456 or TIME: 00:02-00:05 or [123-456]
      const timeMatch = block.match(/TIME:.*?(\d+)\s*[-–]\s*(\d+)/i);
      const reasonMatch = block.match(/REASON:\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*CLIP|$)/is);
      
      if (timeMatch) {
        const start = parseInt(timeMatch[1]) || 0;
        const end = parseInt(timeMatch[2]) || 0;

        // Validate time
        if (start >= 0 && end > start) {
          highlights.push({
            title,
            start,
            end,
            reason: reasonMatch?.[1]?.trim() || ""
          });
        }
      }
    });
  }

  return {
    notes,
    captions: captions.length ? captions : ["Captions could not be parsed. Please try again."],
    reelScript: { hook, content: reelContent, cta },
    highlights
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

  return `Analyze this video transcript and create four outputs:
  
  TONE INSTRUCTION: ${toneInstruction}

(1) NOTES: Create structured notes with headings (use ## for headings) and bullet points (use •). Include all key concepts, facts, and insights.

(2) CAPTIONS: Create exactly 6 short, engaging social media captions (Instagram/Twitter ready) with emojis and hashtags.

(3) REEL SCRIPT: Create a 30-60 second viral reel script with Hook, Content, and CTA sections.

(4) HIGHLIGHTS: Identify the TOP 3-5 most engaging moments in the video that best match the ${tone.toUpperCase()} tone. Each clip MUST be a continuous segment between 15 and 60 seconds long. Return EXACTLY in this format for EACH highlight:
CLIP: [Short Title]
TIME: [StartSeconds-EndSeconds] (Must use total seconds, e.g. 45-105)
REASON: [Why this fits the tone]

Return EXACTLY in this format:

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
... (repeat for 3-5 clips)

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

    // Step 1: Fetch transcript
    let transcript = "";
    let rawItems: any[] = [];
    const fetchAttempts = [
      async () => YoutubeTranscript.fetchTranscript(videoId),
      async () => YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }),
    ];

    for (const attempt of fetchAttempts) {
      try {
        rawItems = await attempt();
        if (rawItems && rawItems.length > 0) {
          // Format with timestamps: [00:15] text...
          transcript = rawItems.map((i) => {
            const mins = Math.floor(i.offset / 1000 / 60);
            const secs = Math.floor((i.offset / 1000) % 60);
            const timeStr = `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
            return `${timeStr} ${i.text}`;
          }).join(" ").replace(/\s+/g, " ").trim();
          break;
        }
      } catch (e) {
        console.warn(`Transcript attempt failed:`, e);
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { 
          error: "Could not extract transcript.",
          details: "This usually happens if the video has no captions, is private, or contains restricted content. Please ensure the video has closed-captions (CC) enabled."
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

    // Limit to ~8000 words
    const words = transcript.split(" ");
    const limitedTranscript = words.length > 8000
      ? words.slice(0, 8000).join(" ") + "..."
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
