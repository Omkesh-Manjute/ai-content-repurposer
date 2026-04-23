"use client";

import { useState, useEffect, useCallback } from "react";
import { PROVIDERS, type ProviderId, type Provider } from "@/lib/providers";

// ─── localStorage helpers ─────────────────────────────
const LS_KEYS_KEY = "ai_repurposer_api_keys";
const LS_REMEMBER_KEY = "ai_repurposer_remember";

function loadSavedKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveKeyForProvider(providerId: string, key: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadSavedKeys();
    existing[providerId] = key;
    localStorage.setItem(LS_KEYS_KEY, JSON.stringify(existing));
  } catch {}
}

function clearKeyForProvider(providerId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadSavedKeys();
    delete existing[providerId];
    localStorage.setItem(LS_KEYS_KEY, JSON.stringify(existing));
  } catch {}
}

function loadRememberPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_REMEMBER_KEY) === "true";
  } catch {
    return false;
  }
}

// ─── Utils ────────────────────────────────────────────
function isValidYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/.test(url);
}

interface InputSectionProps {
  onGenerate: (url: string, apiKey: string, provider: ProviderId, model: string, tone: string) => void;
  errorMessage: string;
  isError: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  Free: "#10b981",
  "Free • New": "#10b981",
  "Free • Reasoning": "#ec4899",
  "Free • Auto": "#06b6d4",
  Fastest: "#06b6d4",
  Fast: "#06b6d4",
  "Ultra Fast": "#06b6d4",
  Smart: "#a78bfa",
  Powerful: "#f59e0b",
  Reasoning: "#ec4899",
  MoE: "#8b5cf6",
  Versatile: "#8b5cf6",
  Stable: "#6b7280",
  Google: "#4285F4",
  Affordable: "#10b981",
  Optimized: "#76B900",
  NVIDIA: "#76B900",
  Efficient: "#06b6d4",
};

function getBadgeColor(badge: string) {
  return BADGE_COLORS[badge] || "#8b5cf6";
}

// ─── Provider Dropdown ────────────────────────────────
function ProviderSelector({ selected, onChange }: { selected: Provider; onChange: (id: ProviderId) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        id="provider-selector"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "var(--bg-input)",
          border: `1px solid ${open ? selected.color + "80" : "var(--border)"}`,
          borderRadius: "14px",
          cursor: "pointer",
          transition: "all 0.25s ease",
          boxShadow: open ? `0 0 0 3px ${selected.color}20` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${selected.color}20`, border: `1px solid ${selected.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
            {selected.icon}
          </span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>{selected.name}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selected.models.length} models available</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "var(--bg-dropdown)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", zIndex: 200, backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          {PROVIDERS.map((provider) => {
            const isActive = provider.id === selected.id;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => { onChange(provider.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: isActive ? `${provider.color}15` : "transparent", border: "none", borderLeft: isActive ? `3px solid ${provider.color}` : "3px solid transparent", cursor: "pointer", transition: "background 0.15s ease", textAlign: "left" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover-translucent)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${provider.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0 }}>
                  {provider.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: isActive ? provider.color : "var(--text-primary)" }}>{provider.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{provider.models.length} models</div>
                </div>
                {isActive && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={provider.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Model Dropdown ───────────────────────────────────
function ModelSelector({ provider, selected, onChange }: { provider: Provider; selected: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedModel = provider.models.find((m) => m.id === selected) || provider.models[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        id="model-selector"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "var(--bg-input)", border: `1px solid ${open ? provider.color + "80" : "var(--border)"}`, borderRadius: "14px", cursor: "pointer", transition: "all 0.25s ease", boxShadow: open ? `0 0 0 3px ${provider.color}20` : "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "16px" }}>🤖</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>{selectedModel.name}</div>
            {selectedModel.badge && (
              <div style={{ display: "flex", gap: "6px", marginTop: "2px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: getBadgeColor(selectedModel.badge), background: `${getBadgeColor(selectedModel.badge)}18`, padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.05em", textTransform: "uppercase", border: `1px solid ${getBadgeColor(selectedModel.badge)}30` }}>
                  {selectedModel.badge}
                </span>
                {selectedModel.context && <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{selectedModel.context}</span>}
              </div>
            )}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "var(--bg-dropdown)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", zIndex: 200, backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "380px", overflowY: "auto" }}>
          {provider.models.map((model) => {
            const isActive = model.id === selected;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => { onChange(model.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: isActive ? `${provider.color}12` : "transparent", border: "none", borderLeft: isActive ? `3px solid ${provider.color}` : "3px solid transparent", cursor: "pointer", transition: "background 0.15s ease" }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover-translucent)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: isActive ? provider.color : "var(--text-primary)" }}>{model.name}</div>
                  {model.badge && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "3px", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: getBadgeColor(model.badge), letterSpacing: "0.05em", textTransform: "uppercase" }}>{model.badge}</span>
                      {model.context && <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>• {model.context}</span>}
                    </div>
                  )}
                </div>
                {isActive && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={provider.color} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Remember Toggle ──────────────────────────────────
function RememberToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "0" }}
    >
      {/* Track */}
      <div style={{
        width: "36px", height: "20px", borderRadius: "10px",
        background: checked ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.1)",
        border: checked ? "1px solid rgba(139,92,246,0.8)" : "1px solid rgba(255,255,255,0.15)",
        position: "relative", transition: "all 0.25s ease", flexShrink: 0
      }}>
        {/* Thumb */}
        <div style={{
          position: "absolute", top: "2px",
          left: checked ? "18px" : "2px",
          width: "14px", height: "14px", borderRadius: "50%",
          background: checked ? "#fff" : "rgba(255,255,255,0.5)",
          transition: "left 0.25s ease, background 0.25s ease"
        }} />
      </div>
      <span style={{ fontSize: "12px", color: checked ? "#c4b5fd" : "var(--text-muted)", fontWeight: 500 }}>
        {checked ? "🔐 Key saved locally" : "Remember API Key"}
      </span>
    </button>
  );
}

// ─── Tone Selection ───────────────────────────────────
const TONES = [
  { id: "engaging", label: "Engaging", icon: "✨", desc: "Punchy & viral" },
  { id: "professional", label: "Professional", icon: "💼", desc: "Formal & clean" },
  { id: "funny", label: "Funny", icon: "😂", desc: "Humorous & light" },
  { id: "educational", label: "Educational", icon: "🎓", desc: "Informative & deep" },
  { id: "minimalist", label: "Minimalist", icon: "🌑", desc: "Short & direct" },
];

function ToneSelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
      {TONES.map((tone) => {
        const isActive = tone.id === selected;
        return (
          <button
            key={tone.id}
            type="button"
            onClick={() => onChange(tone.id)}
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              background: isActive ? "rgba(139,92,246,0.15)" : "var(--bg-hover-translucent)",
              border: `1px solid ${isActive ? "rgba(139,92,246,0.5)" : "var(--border)"}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: isActive ? "0 4px 12px rgba(139,92,246,0.15)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>{tone.icon}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: isActive ? "var(--accent-purple)" : "var(--text-primary)" }}>
                {tone.label}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tone.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main InputSection ────────────────────────────────
export default function InputSection({ onGenerate, errorMessage, isError }: InputSectionProps) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [providerId, setProviderId] = useState<ProviderId>("openrouter");
  const [modelId, setModelId] = useState("openrouter/auto");
  const [rememberKey, setRememberKey] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [toneId, setToneId] = useState("engaging");

  const selectedProvider = PROVIDERS.find((p) => p.id === providerId)!;

  // Load saved keys & remember preference on mount
  useEffect(() => {
    const remember = loadRememberPref();
    const keys = loadSavedKeys();
    setRememberKey(remember);
    setSavedKeys(keys);
    if (remember && keys["openrouter"]) {
      setApiKey(keys["openrouter"]);
    }
  }, []);

  // When provider changes, load saved key for that provider
  const handleProviderChange = useCallback((id: ProviderId) => {
    const provider = PROVIDERS.find((p) => p.id === id)!;
    setProviderId(id);
    setModelId(provider.models[0].id);
    setUrlError("");
    if (rememberKey && savedKeys[id]) {
      setApiKey(savedKeys[id]);
    } else {
      setApiKey("");
    }
  }, [rememberKey, savedKeys]);

  // When "Remember" toggle changes
  const handleRememberChange = (val: boolean) => {
    setRememberKey(val);
    localStorage.setItem(LS_REMEMBER_KEY, String(val));
    if (val && apiKey.trim()) {
      saveKeyForProvider(providerId, apiKey.trim());
      setSavedKeys((prev) => ({ ...prev, [providerId]: apiKey.trim() }));
    } else if (!val) {
      // Clear all saved keys
      localStorage.removeItem(LS_KEYS_KEY);
      setSavedKeys({});
    }
  };

  // When API key changes and remember is on, auto-save
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setUrlError("");
    if (rememberKey && val.trim().length > 8) {
      saveKeyForProvider(providerId, val.trim());
      setSavedKeys((prev) => ({ ...prev, [providerId]: val.trim() }));
    }
  };

  // Proactive warm-up for Railway backend
  useEffect(() => {
    let vId = null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) vId = u.searchParams.get("v");
      else if (u.hostname.includes("youtu.be")) vId = u.pathname.slice(1);
    } catch (e) {}

    const pythonUrl = "https://ai-content-repurposer-production-1b9a.up.railway.app";
    
    if (vId && pythonUrl) {
      fetch(pythonUrl.replace(/\/$/, ""), { mode: 'no-cors' }).catch(() => {});
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setUrlError("Please enter a YouTube URL."); return; }
    if (!isValidYouTubeUrl(url)) { setUrlError("Please enter a valid YouTube URL (youtube.com or youtu.be)."); return; }
    if (!apiKey.trim()) { setUrlError(`Please enter your ${selectedProvider.name} API key.`); return; }
    
    setUrlError("");
    onGenerate(url.trim(), apiKey.trim(), providerId, modelId, toneId);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setUrlError("");
    } catch { /* denied */ }
  };

  const isSaved = rememberKey && !!savedKeys[providerId];

  return (
    <div className="glass-card fade-in-up" style={{ padding: "40px", marginBottom: "32px" }}>
      <form onSubmit={handleSubmit}>

        {/* ── STEP 1: YouTube URL ── */}
        <div style={{ marginBottom: "24px" }}>
          <label htmlFor="youtube-url" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step 1 — YouTube Video URL
          </label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "20px" }}>🎬</div>
            <input
              id="youtube-url"
              type="url"
              className="input-field"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              placeholder="https://youtube.com/watch?v=..."
              style={{ paddingLeft: "52px", paddingRight: "100px" }}
              autoComplete="off"
            />
            <button type="button" onClick={handlePaste} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--accent-purple)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
              Paste
            </button>
          </div>
        </div>

        {/* ── STEP 2: Provider + Model ── */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step 2 — Choose AI Provider & Model
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 500 }}>Provider</div>
              <ProviderSelector selected={selectedProvider} onChange={handleProviderChange} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 500 }}>Model</div>
              <ModelSelector provider={selectedProvider} selected={modelId} onChange={setModelId} />
            </div>
          </div>
        </div>

        {/* ── STEP 3: API Key ── */}
        <div style={{ marginBottom: "28px" }}>
          <label htmlFor="api-key" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step 3 — {selectedProvider.apiKeyLabel}
          </label>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "28px", height: "28px", borderRadius: "8px", background: `${selectedProvider.color}20`, border: `1px solid ${selectedProvider.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
              {selectedProvider.icon}
            </div>
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              className="input-field"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={isSaved ? "✓ Key saved — click Show to reveal" : selectedProvider.apiKeyPlaceholder}
              style={{ paddingLeft: "54px", paddingRight: "120px", borderColor: isSaved ? `${selectedProvider.color}60` : apiKey ? `${selectedProvider.color}40` : undefined }}
              autoComplete="off"
            />
            <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--accent-purple)", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          {/* Row: link + saved indicator + remember toggle */}
          <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
              <span>🔒 Get free key at</span>
              <a href={selectedProvider.apiKeyLink} target="_blank" rel="noopener noreferrer" style={{ color: selectedProvider.color, textDecoration: "underline", fontWeight: 500 }}>
                {selectedProvider.apiKeyLinkText}
              </a>
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {isSaved && (
                <button
                  type="button"
                  onClick={() => {
                    clearKeyForProvider(providerId);
                    setSavedKeys((prev) => { const n = { ...prev }; delete n[providerId]; return n; });
                    setApiKey("");
                  }}
                  style={{ fontSize: "11px", color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "3px 10px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Clear saved
                </button>
              )}
              <RememberToggle checked={rememberKey} onChange={handleRememberChange} />
            </div>
          </div>
        </div>

        {/* ── STEP 4: Tone Selection ── */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Step 4 — Select Output Tone
          </label>
          <ToneSelector selected={toneId} onChange={setToneId} />
        </div>

        {/* Error */}
        {(urlError || isError) && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: "14px", color: "#fca5a5", lineHeight: 1.5, margin: 0 }}>{urlError || errorMessage}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%", fontSize: "17px", padding: "18px", background: `linear-gradient(135deg, ${selectedProvider.color}, ${selectedProvider.color}bb)` }}
        >
          <span style={{ marginRight: "10px" }}>✨</span>
          Generate with {selectedProvider.name}
          <span style={{ opacity: 0.85, marginLeft: "8px", fontSize: "14px" }}>
            — {selectedProvider.models.find((m) => m.id === modelId)?.name || modelId}
          </span>
        </button>

        {/* Supported URL formats */}
        <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          {["youtube.com/watch?v=", "youtu.be/", "youtube.com/shorts/"].map((fmt) => (
            <span key={fmt} style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-hover-translucent)", padding: "4px 10px", borderRadius: "6px", fontFamily: "monospace" }}>
              {fmt}
            </span>
          ))}
        </div>
      </form>
    </div>
  );
}
