"use client";

import { useState, useRef } from "react";
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
    url?: string; // final processed clip url
  }[];
  videoTitle?: string;
  videoId?: string;
  providerUsed?: string;
  modelUsed?: string;
};

export type AppState = "idle" | "processing" | "done" | "error";

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (url: string, apiKey: string, provider: ProviderId, model: string, tone: string) => {
    setAppState("processing");
    setErrorMessage("");
    setProcessingStep(1);

    try {
      setProcessingStep(1);
      await new Promise((r) => setTimeout(r, 400));
      setProcessingStep(2);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, apiKey, provider, model, tone }),
      });

      setProcessingStep(3);
      const data = await response.json();

      if (!response.ok) {
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

  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
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

      <div style={{ position: "relative", zIndex: 1 }}>
        <HeroSection />

        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "0 20px 80px",
          }}
        >
          {/* Input area */}
          {(appState === "idle" || appState === "error") && (
            <InputSection
              onGenerate={handleGenerate}
              errorMessage={errorMessage}
              isError={appState === "error"}
            />
          )}

          {/* Processing */}
          {appState === "processing" && (
            <ProcessingSection step={processingStep} />
          )}

          {/* Output */}
          {appState === "done" && content && (
            <div ref={outputRef}>
              <OutputSection content={content} onReset={handleReset} />
            </div>
          )}
        </div>

        {/* Features below fold */}
        {appState === "idle" && <FeaturesSection />}
      </div>
    </main>
  );
}
