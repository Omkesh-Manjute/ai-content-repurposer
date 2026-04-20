"use client";

import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Navbar({ isLoggedIn, onLogin, onLogout }: NavbarProps) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        background: "var(--bg-hover-translucent)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "all 0.3s ease",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, var(--accent-purple), var(--accent-pink))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
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

      {/* Center Links (Desktop only typically, but we'll show on all for demo) */}
      <div style={{ display: "flex", gap: "24px", alignItems: "center", fontWeight: 500 }}>
        {["Home", "About", "Terms", "Privacy"].map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            style={{
              textDecoration: "none",
              color: "var(--text-secondary)",
              fontSize: "14px",
              transition: "color 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            {link}
          </a>
        ))}
      </div>

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <ThemeToggle />
        {isLoggedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src="https://api.dicebear.com/7.x/notionists/svg?seed=DemoUser&backgroundColor=b6e3f4"
                alt="Avatar"
                style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border)" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Demo User
              </span>
            </div>
            <button
              onClick={onLogout}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--bg-hover-translucent)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            style={{
              background: "var(--accent-purple)",
              border: "none",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(139, 92, 246, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
            }}
          >
            Login / Start Demo
          </button>
        )}
      </div>
    </nav>
  );
}
