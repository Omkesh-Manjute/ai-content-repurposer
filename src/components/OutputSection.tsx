"use client";

import { useState } from "react";
import type { GeneratedContent } from "@/app/page";

interface OutputSectionProps {
  content: GeneratedContent;
  onReset: () => void;
}

type Tab = "notes" | "captions" | "reel" | "highlights";

const TABS: { id: Tab; label: string; icon: string; badge: string; badgeClass: string }[] = [
  { id: "notes", label: "Smart Notes", icon: "📝", badge: "Structured", badgeClass: "badge-purple" },
  { id: "captions", label: "Captions", icon: "📱", badge: "Social Ready", badgeClass: "badge-pink" },
  { id: "reel", label: "Reel Script", icon: "🎬", badge: "Viral Format", badgeClass: "badge-cyan" },
  { id: "highlights", label: "Viral Clips", icon: "🎞️", badge: "One-Click Cut", badgeClass: "badge-purple" },
];

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

function NotesOutput({ notes }: { notes: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown-ish notes for pretty rendering
  const renderLine = (line: string, idx: number) => {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      return (
        <h3
          key={idx}
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#a78bfa",
            marginTop: "20px",
            marginBottom: "8px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {line.replace(/^#+\s*/, "")}
        </h3>
      );
    }
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      return (
        <div
          key={idx}
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "6px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "var(--accent-purple)", flexShrink: 0, marginTop: "2px" }}>•</span>
          <span style={{ color: "var(--text-primary)", fontSize: "15px", lineHeight: 1.7 }}>
            {line.replace(/^[•\-\*]\s*/, "")}
          </span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={idx} style={{ height: "8px" }} />;
    return (
      <p key={idx} style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: "4px" }}>
        {line}
      </p>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", gap: "8px" }}>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? "✅ Copied!" : "📋 Copy Notes"}
        </button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(notes)}`}
          download="notes.txt"
          style={{ textDecoration: "none" }}
        >
          <button className="copy-btn">⬇️ Download TXT</button>
        </a>
      </div>
      <div className="output-box">
        {notes.split("\n").map((line, idx) => renderLine(line, idx))}
      </div>
    </div>
  );
}

function CaptionsOutput({ captions }: { captions: string[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyCaption = async (text: string, idx: number) => {
    await copyToClipboard(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = async () => {
    await copyToClipboard(captions.join("\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const captionColors = [
    { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", badge: "#a78bfa" },
    { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.2)", badge: "#f472b6" },
    { bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)", badge: "#22d3ee" },
    { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", badge: "#34d399" },
    { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", badge: "#fbbf24" },
    { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", badge: "#f87171" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="copy-btn" onClick={copyAll}>
          {copiedAll ? "✅ All Copied!" : "📋 Copy All Captions"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {captions.map((caption, idx) => {
          const color = captionColors[idx % captionColors.length];
          return (
            <div
              key={idx}
              style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: "14px",
                padding: "18px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: color.border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: color.badge,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {caption}
                </p>
              </div>
              <button
                className="copy-btn"
                onClick={() => copyCaption(caption, idx)}
                style={{ flexShrink: 0, fontSize: "12px", padding: "6px 12px" }}
              >
                {copiedIdx === idx ? "✅" : "📋"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReelOutput({ reelScript }: { reelScript: GeneratedContent["reelScript"] }) {
  const [copied, setCopied] = useState(false);
  const fullScript = `HOOK:\n${reelScript.hook}\n\nCONTENT:\n${reelScript.content}\n\nCTA:\n${reelScript.cta}`;

  const handleCopy = async () => {
    await copyToClipboard(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      label: "🪝 Hook",
      subtitle: "Grab attention in 3 seconds",
      content: reelScript.hook,
      bg: "rgba(139,92,246,0.1)",
      border: "rgba(139,92,246,0.3)",
      labelColor: "#a78bfa",
      timing: "0–3 sec",
    },
    {
      label: "📦 Content",
      subtitle: "Deliver the core value",
      content: reelScript.content,
      bg: "rgba(6,182,212,0.08)",
      border: "rgba(6,182,212,0.2)",
      labelColor: "#22d3ee",
      timing: "3–25 sec",
    },
    {
      label: "📣 Call to Action",
      subtitle: "Tell them what to do next",
      content: reelScript.cta,
      bg: "rgba(236,72,153,0.08)",
      border: "rgba(236,72,153,0.2)",
      labelColor: "#f472b6",
      timing: "25–30 sec",
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div className="badge badge-cyan">🎬 30–60 Second Reel Format</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "✅ Copied!" : "📋 Copy Script"}
          </button>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(fullScript)}`}
            download="reel-script.txt"
            style={{ textDecoration: "none" }}
          >
            <button className="copy-btn">⬇️ Download</button>
          </a>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {sections.map((section) => (
          <div
            key={section.label}
            style={{
              background: section.bg,
              border: `1px solid ${section.border}`,
              borderRadius: "16px",
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: section.labelColor,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {section.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  {section.subtitle}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: section.labelColor,
                  background: section.border,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                }}
              >
                {section.timing}
              </span>
            </div>
            <p
              style={{
                fontSize: "15px",
                lineHeight: 1.75,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {section.content || (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  No content generated for this section.
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightsOutput({ 
  highlights, 
  videoId,
  onGenerate,
  states,
  errors
}: { 
  highlights: GeneratedContent["highlights"], 
  videoId?: string,
  onGenerate: (idx: number, highlight: any) => void,
  states: Record<number, string>,
  errors: Record<number, string>
}) {
  if (!highlights || highlights.length === 0) {
    return (
      <div className="output-box" style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "var(--text-muted)" }}>No specific highlights identified for this tone.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div className="badge badge-purple">🎞️ Detected Highlights</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {highlights.map((highlight, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--bg-hover-translucent)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h4 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0" }}>
                  {highlight.title}
                </h4>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                  Reason: {highlight.reason}
                </p>
              </div>
              <div
                style={{
                  background: "rgba(167,139,250,0.1)",
                  color: "#a78bfa",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "monospace"
                }}
              >
                {Math.floor(highlight.start / 60)}:{(highlight.start % 60).toString().padStart(2, '0')} - {Math.floor(highlight.end / 60)}:{(highlight.end % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                className="copy-btn"
                style={{ flex: 1, position: "relative", overflow: "hidden" }}
                onClick={() => onGenerate(idx, highlight)}
                disabled={states[idx] === "processing" || states[idx] === "done"}
              >
                {states[idx] === "processing" ? (
                  <>
                    <span className="shimmer" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation: "shimmer 1.5s infinite" }} />
                    ⏳ Cutting 1080p Clip...
                  </>
                ) : states[idx] === "done" ? (
                  "✅ Clip Ready (View at Top)"
                ) : (
                  "✂️ Create HQ Clip"
                )}
              </button>
              
              <a 
                href={`https://www.youtube.com/watch?v=${videoId}&t=${highlight.start}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button className="copy-btn" title="Preview on YouTube">
                  📺 Source
                </button>
              </a>
            </div>

            {states[idx] === "error" && (
              <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0 0" }}>
                ❌ {errors[idx] || "Internal cutting error. Try again."}
              </p>
            )}
            
            {states[idx] === "processing" && (
              <div style={{ textAlign: "center", marginTop: "4px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: 0 }}>
                  🚀 Turbo-downloading High Resolution (1080p)...
                </p>
                <p style={{ color: "var(--accent-purple)", fontSize: "10px", margin: "2px 0 0 0", fontWeight: 600 }}>
                  Merging audio & video (Estimated 15-45s)
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputWithShelf({ content, onReset }: OutputSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [clippingStates, setClippingStates] = useState<Record<number, "idle" | "processing" | "done" | "error">>({});
  const [clipUrls, setClipUrls] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const hasReadyClips = Object.values(clippingStates).includes("done");

  const generateClip = async (idx: number, highlight: any) => {
    if (!content.videoId) return;
    
    setClippingStates(prev => ({ ...prev, [idx]: "processing" }));
    setErrors(prev => ({ ...prev, [idx]: "" }));

    try {
      const response = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${content.videoId}`,
          start: highlight.start,
          end: highlight.end,
          filename: `clip_${content.videoId}_${idx}_${Date.now()}.mp4`
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate clip");

      setClipUrls(prev => ({ ...prev, [idx]: data.path }));
      setClippingStates(prev => ({ ...prev, [idx]: "done" }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [idx]: err.message }));
      setClippingStates(prev => ({ ...prev, [idx]: "error" }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 🎞️ Viral Clips Top Shelf */}
      {hasReadyClips && (
        <div className="glass-card fade-in-up" style={{ padding: "24px", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>🔥</span>
            <div>
               <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Ready Viral Clips</h2>
               <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>High Resolution (1080p) · Sliced & Ready</p>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {Object.entries(clipUrls).map(([idxStr, url]) => {
              const idx = parseInt(idxStr);
              const highlight = content.highlights[idx];
              return (
                <div key={idx} className="fade-in-up" style={{ background: "var(--bg-secondary)", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                   <video 
                    src={url} 
                    controls 
                    style={{ width: "100%", aspectRatio: "16/9", background: "#000", display: "block" }}
                  />
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{highlight?.title || `Clip #${idx + 1}`}</h4>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>{highlight?.reason?.substring(0, 60)}...</p>
                      </div>
                      <span style={{ fontSize: "10px", background: "rgba(167,139,250,0.2)", color: "#a78bfa", padding: "2px 6px", borderRadius: "4px", fontWeight: 800 }}>1080P HQ</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <a href={url} download style={{ textDecoration: "none", flex: 1 }}>
                        <button className="copy-btn" style={{ width: "100%", background: "#10b981", borderColor: "#059669", fontSize: "13px" }}>
                          ⬇️ Download MP4
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="glass-card" style={{ padding: "32px", minHeight: "600px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span className={`badge ${tab.badgeClass}`} style={{ padding: "2px 8px", fontSize: "10px" }}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>

        <div key={activeTab} className="fade-in-up">
          {activeTab === "notes" && <NotesOutput notes={content.notes} />}
          {activeTab === "captions" && <CaptionsOutput captions={content.captions} />}
          {activeTab === "reel" && <ReelOutput reelScript={content.reelScript} />}
          {activeTab === "highlights" && (
            <HighlightsOutput 
              highlights={content.highlights} 
              videoId={content.videoId} 
              onGenerate={generateClip}
              states={clippingStates}
              errors={errors}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function OutputSection({ content, onReset }: OutputSectionProps) {
  if (!content) return null;
  return (
    <div className="fade-in-up">
      {/* Success banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.08))",
          border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: "16px",
          padding: "18px 24px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🎉</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#34d399" }}>
              Content Generated Successfully!
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {content.providerUsed && content.modelUsed
                ? `${content.providerUsed} · ${content.modelUsed} · High Quality`
                : "3 content formats ready · Notes, Captions & Reel Script"}
            </div>
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            background: "var(--bg-hover-translucent)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            padding: "8px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.2s ease",
          }}
        >
          🔄 Try Another Video
        </button>
      </div>

      {/* 📺 Real YouTube Player at Top */}
      {content.videoId && (
        <div
          className="glass-card fade-in-up"
          style={{
            marginBottom: "24px",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            background: "#000",
            position: "relative",
            paddingTop: "56.25%", // 16:9 Aspect Ratio
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${content.videoId}?autoplay=0&rel=0&modestbranding=1`}
            title="Full Video Source"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      )}

      {/* TABS & OUTPUT BOX */}
      <OutputWithShelf content={content} onReset={onReset} />
    </div>
  );
}
