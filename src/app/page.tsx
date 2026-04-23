"use client";

import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import InputSection from "@/components/InputSection";
import ProcessingSection from "@/components/ProcessingSection";
import OutputSection from "@/components/OutputSection";
import FeaturesSection from "@/components/FeaturesSection";
import type { ProviderId } from "@/lib/providers";

export type GeneratedContent = {
  notes: string;
  captions: string[];
  reelScript: {
    hook: string;
    content: string;
    cta: string;
  };
  highlights: {
    title: string;
    start: number;
    end: number;
    reason: string;
    url?: string;
  }[];
  videoTitle?: string;
  videoId?: string;
  providerUsed?: string;
  modelUsed?: string;
};

export type AppState = "idle" | "processing" | "done" | "error";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [appState, setAppState] = useState<AppState>("idle");
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  // Login modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const outputRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (url: string, apiKey: string, provider: ProviderId, model: string, tone: string, transcript?: string) => {
    setAppState("processing");
    setErrorMessage("");
    setProcessingStep(1);

    try {
      setProcessingStep(1);
      await new Promise((r) => setTimeout(r, 400));
      setProcessingStep(2);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey, provider, model, tone, transcript }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      setProcessingStep(3);
      const data = await response.json();

      if (!response.ok) {
        if (data.isBlockError) {
          // Client-side bypass: Try Render directly from browser (No Vercel 10s limit)
          const pythonUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;
          const videoId = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
          
          if (pythonUrl && videoId) {
            setProcessingStep(2); // "Extracting Transcript"
            try {
              const directRes = await fetch(`${pythonUrl.replace(/\/$/, "")}/transcript/${videoId}`);
              if (directRes.ok) {
                const directData = await directRes.json();
                if (directData.transcript) {
                  // Retry generate with the transcript we just got
                  return handleGenerate(url, apiKey, provider, model, tone, directData.transcript.map((t: any) => t.text).join(" "));
                }
              }
            } catch (e) {
              console.error("Direct bypass failed:", e);
            }
          }
        }
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setProcessingStep(4);
      await new Promise((r) => setTimeout(r, 300));

      setContent(data);
      setAppState("done");

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error occurred";
      setErrorMessage(msg);
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setContent(null);
    setErrorMessage("");
    setProcessingStep(0);
  };

  const triggerLogin = () => {
    setLoginError("");
    setShowLoginModal(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (loginUserId === "demo" && loginPassword === "password") {
      setShowLoginModal(false);
      setIsLoggedIn(true);
      setTimeout(() => {
        window.scrollTo({ top: 300, behavior: "smooth" });
      }, 100);
    } else {
      setLoginError("Invalid User ID or password!");
    }
  };

  return (
    <main style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Animated mesh background */}
      <div className="mesh-bg" />

      {/* Extra glow orbs */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        
        <Navbar 
          isLoggedIn={isLoggedIn} 
          onLogin={triggerLogin} 
          onLogout={() => {
            setIsLoggedIn(false);
            setLoginUserId("");
            setLoginPassword("");
          }} 
        />

        <div id="home">
          <HeroSection 
            isLoggedIn={isLoggedIn} 
            onGetStarted={triggerLogin} 
          />
        </div>

        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "0 20px 40px",
            width: "100%",
          }}
        >
          {isLoggedIn ? (
            <>
              {/* Workspace Tools (Only visible after login) */}
              {(appState === "idle" || appState === "error") && (
                <div className="fade-in-up">
                  <InputSection
                    onGenerate={handleGenerate}
                    errorMessage={errorMessage}
                    isError={appState === "error"}
                  />
                </div>
              )}

              {appState === "processing" && (
                <ProcessingSection step={processingStep} />
              )}

              {appState === "done" && content && (
                <div ref={outputRef}>
                  <OutputSection content={content} onReset={handleReset} />
                </div>
              )}
            </>
          ) : (
             <div 
               className="fade-in-up" 
               style={{ 
                 textAlign: "center", 
                 padding: "60px 20px", 
                 background: "var(--bg-hover-translucent)", 
                 borderRadius: "24px", 
                 border: "1px solid var(--border)",
                 marginBottom: "40px",
               }}
             >
               <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
               <h3 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>Workspace Locked</h3>
               <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>Please log in to access the AI Content Repurposer tool.</p>
               <button
                 onClick={triggerLogin}
                 style={{
                   background: "var(--accent-purple)",
                   color: "white",
                   border: "none",
                   padding: "12px 28px",
                   borderRadius: "12px",
                   fontSize: "16px",
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
                 Connect to Account
               </button>
             </div>
          )}
        </div>

        <div id="about">
          <FeaturesSection />
        </div>
        
        <Footer />
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="fade-in-up"
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: "24px",
              padding: "40px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "24px",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
              }}
            >
              &times;
            </button>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--accent-purple), var(--accent-pink))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  margin: "0 auto 16px",
                  boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                }}
              >
                ✨
              </div>
              <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                Welcome Back
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                Sign in to your Collega account.
              </p>
              <p style={{ color: "var(--accent-cyan)", fontSize: "12px", marginTop: "8px", fontWeight: 600 }}>
                Demo Credentials: User ID "demo", Password "password"
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {loginError && (
                <div style={{ color: "#ef4444", fontSize: "14px", textAlign: "center", background: "rgba(239, 68, 68, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                  {loginError}
                </div>
              )}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your User ID"
                  value={loginUserId}
                  onChange={(e) => setLoginUserId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-hover-translucent)",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-hover-translucent)",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: "var(--accent-purple)",
                  color: "white",
                  border: "none",
                  padding: "14px",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: "12px",
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
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

