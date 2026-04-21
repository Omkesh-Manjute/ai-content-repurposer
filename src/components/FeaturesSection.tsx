"use client";

const FEATURES = [
  {
    icon: "🎬",
    title: "YouTube Transcript Extraction",
    description:
      "Automatically fetches subtitles and auto-generated captions from any YouTube video. No manual copy-pasting required.",
    badge: "Instant",
    badgeClass: "badge-purple",
  },
  {
    icon: "📝",
    title: "Smart Structured Notes",
    description:
      "AI organizes the key ideas into headings, subheadings, and bullet points — perfect for studying or quick revision.",
    badge: "Study Mode",
    badgeClass: "badge-emerald",
  },
  {
    icon: "📱",
    title: "6 Social Media Captions",
    description:
      "Get 6 ready-to-post Instagram/Twitter captions with emojis and hashtags. Repurpose video content in seconds.",
    badge: "Creator Tools",
    badgeClass: "badge-pink",
  },
  {
    icon: "🎬",
    title: "Viral Reel Script",
    description:
      "Generate a hook → content → CTA reel script optimized for short-form video. Designed to stop the scroll.",
    badge: "Viral Format",
    badgeClass: "badge-cyan",
  },
  {
    icon: "⬇️",
    title: "Copy & Download",
    description:
      "Copy any section to clipboard with one click, or download as a .txt file for offline editing.",
    badge: "Export",
    badgeClass: "badge-purple",
  },
  {
    icon: "🔒",
    title: "Private & Secure",
    description:
      "Your API key is NEVER stored on our servers. All processing happens in-session and data is discarded immediately.",
    badge: "Privacy First",
    badgeClass: "badge-emerald",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Paste YouTube Link", desc: "Drop any YouTube URL into the input field — standard videos, shorts, or embedded links." },
  { step: "02", title: "Enter API Key", desc: "Get your API key from Google AI Studio, Groq, or OpenRouter. It stays private and is never saved." },
  { step: "03", title: "Hit Generate", desc: "Our AI extracts the transcript, analyzes the content, and generates three outputs." },
  { step: "04", title: "Use Your Content", desc: "Copy notes for studying, use captions for Instagram, or record your reel script immediately." },
];

const WHO_ITS_FOR = [
  { emoji: "🎓", label: "Students", desc: "Quick revision notes from lecture videos" },
  { emoji: "🎥", label: "Content Creators", desc: "Repurpose videos into reels and posts" },
  { emoji: "📚", label: "Educators", desc: "Summarize long lectures into handouts" },
  { emoji: "💼", label: "Professionals", desc: "Extract key insights from webinars" },
];

export default function FeaturesSection() {
  return (
    <section style={{ padding: "0 20px 100px" }}>
      {/* How it works */}
      <div style={{ maxWidth: "900px", margin: "0 auto 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="badge badge-purple" style={{ marginBottom: "16px", display: "inline-flex" }}>
            How It Works
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 800,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            From Video to Content in{" "}
            <span className="gradient-text">4 Simple Steps</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
          }}
        >
          {HOW_IT_WORKS.map((item, idx) => (
            <div
              key={item.step}
              className="glass-card"
              style={{ padding: "28px 24px", position: "relative" }}
            >
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 900,
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: "linear-gradient(135deg, var(--accent-purple), var(--accent-pink))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  opacity: 0.6,
                  lineHeight: 1,
                  marginBottom: "16px",
                }}
              >
                {item.step}
              </div>
              {idx < HOW_IT_WORKS.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: "-14px",
                    color: "var(--border-hover)",
                    fontSize: "20px",
                    display: "none",
                  }}
                >
                  →
                </div>
              )}
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth: "900px", margin: "0 auto 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="badge badge-pink" style={{ marginBottom: "16px", display: "inline-flex" }}>
            Features
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 800,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Everything You Need to{" "}
            <span className="gradient-text">Create Faster</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass-card"
              style={{ padding: "28px 24px" }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "16px",
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "var(--glow-purple)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feature.icon}
              </div>
              <div
                className={`badge ${feature.badgeClass}`}
                style={{ marginBottom: "12px", display: "inline-flex" }}
              >
                {feature.badge}
              </div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "10px",
                  lineHeight: 1.3,
                }}
              >
                {feature.title}
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Who it's for */}
      <div style={{ maxWidth: "900px", margin: "0 auto 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 800,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Built for{" "}
            <span className="gradient-text">Students & Creators</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          {WHO_ITS_FOR.map((item) => (
            <div
              key={item.label}
              className="glass-card"
              style={{ padding: "24px", textAlign: "center" }}
            >
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>{item.emoji}</div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                {item.label}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          textAlign: "center",
          padding: "48px 32px",
          background: "linear-gradient(135deg, var(--glow-purple), var(--glow-pink))",
          border: "1px solid var(--border)",
          borderRadius: "24px",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🚀</div>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 800,
            marginBottom: "14px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Ready to 10x Your Content Output?
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.65 }}>
          Paste your first YouTube link above and generate notes, captions, and reel scripts in under 20 seconds.
        </p>
        <button
          className="btn-primary"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          ↑ Get Started Now
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "60px", color: "var(--text-muted)", fontSize: "13px" }}>
        <p>Built with ❤️ using Next.js & Multi-Provider AI (Gemini, Groq, OpenRouter)</p>
        <p style={{ marginTop: "6px" }}>
          <span className="badge badge-purple" style={{ display: "inline-flex", marginRight: "8px" }}>
            Free to Use
          </span>
          <span className="badge badge-emerald" style={{ display: "inline-flex" }}>
            Open Source Friendly
          </span>
        </p>
      </div>
    </section>
  );
}
