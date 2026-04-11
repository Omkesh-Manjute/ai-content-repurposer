"use client";

export default function HeroSection() {
  return (
    <header
      style={{
        textAlign: "center",
        padding: "80px 20px 60px",
        position: "relative",
      }}
    >
      {/* Top badge */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}
      >
        <div className="badge badge-purple">
          <span style={{ fontSize: "16px" }}>✨</span>
          AI-Powered Content Repurposer
        </div>
      </div>

      {/* Main headline */}
      <h1
        style={{
          fontSize: "clamp(36px, 6vw, 72px)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: "24px",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Convert Any Video Into{" "}
        <span className="gradient-text">Notes, Captions</span>
        <br />& Viral Reel Scripts
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "18px",
          color: "var(--text-secondary)",
          maxWidth: "580px",
          margin: "0 auto 48px",
          lineHeight: 1.7,
          fontWeight: 400,
        }}
      >
        Paste any YouTube link → AI extracts the transcript → Instantly generates
        structured notes, social captions, and reel scripts. No more manual work.
      </p>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "40px",
          flexWrap: "wrap",
        }}
      >
        {[
          { value: "10x", label: "Faster than manual" },
          { value: "3", label: "Content formats" },
          { value: "100%", label: "AI-generated" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              className="gradient-text-alt"
            >
              {stat.value}
            </div>
            <div
              style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
