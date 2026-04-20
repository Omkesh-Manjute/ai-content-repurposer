export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        padding: "60px 40px 30px",
        marginTop: "80px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "40px",
        }}
      >
        {/* Brand Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--accent-purple), var(--accent-pink))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              }}
            >
              ✨
            </div>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              Collega<span style={{ color: "var(--accent-cyan)" }}>.ai</span>
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6, maxWidth: "300px" }}>
            The ultimate AI-powered content repurposer. Transform any YouTube video into highly engaging social media assets instantly.
          </p>
        </div>

        {/* Links Column 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>Product</h4>
          {["Features", "Pricing", "API Integration", "Supported Models"].map((link) => (
            <a key={link} href="#" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--accent-purple)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>{link}</a>
          ))}
        </div>

        {/* Links Column 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>Resources</h4>
          {["Documentation", "Help Center", "Community", "Blog"].map((link) => (
            <a key={link} href="#" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--accent-purple)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>{link}</a>
          ))}
        </div>

        {/* Legal Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} id="legal">
          <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", marginBottom: "8px" }}>Legal</h4>
          {["Terms of Service", "Privacy Policy", "Cookie Policy"].map((link) => (
            <a key={link} href="#" style={{ color: "var(--text-secondary)", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--accent-purple)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>{link}</a>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "60px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} Collega.ai Repurposer. All rights reserved.</p>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}>Twitter</span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}>LinkedIn</span>
          <span style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}>GitHub</span>
        </div>
      </div>
    </footer>
  );
}
