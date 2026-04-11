"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="theme-toggle-ph" style={{ width: 44, height: 44 }} />; // Placeholder

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = activeTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="Toggle theme"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        position: "relative",
        zIndex: 9999,
      }}
      className="hover:scale-105 hover:border-var(--border-hover) transition-transform"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
