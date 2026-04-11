import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Content Repurposer — Convert Videos into Notes, Captions & Reels",
  description:
    "Transform any YouTube video into structured notes, social media captions, and viral reel scripts using AI. Save time, boost productivity, and create more content faster.",
  keywords: "AI, YouTube, content repurposer, notes, captions, reel script, video to text, AI summarizer",
  openGraph: {
    title: "AI Content Repurposer",
    description: "Convert long YouTube videos into notes, captions & reel scripts instantly using AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          <div style={{ position: "absolute", top: "24px", right: "24px", zIndex: 1000 }}>
            <ThemeToggle />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
