"use client";

import { useEffect, useState } from "react";

interface ProcessingSectionProps {
  step: number;
}

const STEPS = [
  {
    icon: "🔗",
    title: "Validating YouTube URL",
    description: "Parsing video ID and checking accessibility...",
  },
  {
    icon: "📝",
    title: "Extracting Transcript",
    description: "Fetching subtitles and speech-to-text data...",
  },
  {
    icon: "🤖",
    title: "AI Processing with Gemini",
    description: "Analyzing key points, summarizing content...",
  },
  {
    icon: "✅",
    title: "Generating Output",
    description: "Formatting notes, captions, and reel script...",
  },
];

export default function ProcessingSection({ step }: ProcessingSectionProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card fade-in-up" style={{ padding: "48px 40px", textAlign: "center" }}>
      {/* Animated logo */}
      <div
        style={{
          width: "80px",
          height: "80px",
          margin: "0 auto 32px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          🤖
        </div>
        {/* Spinning ring */}
        <div
          style={{
            position: "absolute",
            inset: "-8px",
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "var(--accent-purple)",
            borderRightColor: "var(--accent-pink)",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>

      <h2
        style={{
          fontSize: "26px",
          fontWeight: 700,
          marginBottom: "10px",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Generating your content...
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "40px" }}>
        This takes about 10–20 seconds • {elapsedSeconds}s elapsed
      </p>

      {/* Progress bar */}
      <div
        style={{
          background: "rgba(139,92,246,0.1)",
          height: "4px",
          borderRadius: "2px",
          marginBottom: "40px",
          overflow: "hidden",
        }}
      >
        <div
          className="progress-bar"
          style={{ width: `${Math.min((step / STEPS.length) * 100, 100)}%`, transition: "width 0.5s ease" }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
        {STEPS.map((s, i) => {
          const isCompleted = i < step - 1;
          const isActive = i === step - 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 18px",
                borderRadius: "12px",
                background: isActive
                  ? "rgba(139, 92, 246, 0.1)"
                  : isCompleted
                  ? "rgba(16, 185, 129, 0.05)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(139, 92, 246, 0.3)"
                  : "1px solid transparent",
                transition: "all 0.3s ease",
                opacity: i > step - 1 ? 0.4 : 1,
              }}
            >
              {/* Status icon */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: isCompleted
                    ? "rgba(16, 185, 129, 0.15)"
                    : isActive
                    ? "rgba(139, 92, 246, 0.15)"
                    : "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                }}
              >
                {isCompleted ? "✅" : isActive ? (
                  <div className="spinner" style={{ width: "18px", height: "18px" }} />
                ) : (
                  s.icon
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: isCompleted
                      ? "var(--accent-emerald)"
                      : isActive
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {s.title}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {s.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fun tip */}
      <div
        style={{
          marginTop: "32px",
          padding: "12px 18px",
          background: "rgba(6, 182, 212, 0.05)",
          border: "1px solid rgba(6, 182, 212, 0.1)",
          borderRadius: "10px",
          fontSize: "13px",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        💡 Tip: Works best with educational videos, tutorials, podcasts, and talks with subtitles
      </div>
    </div>
  );
}
