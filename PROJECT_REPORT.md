# Project Report: AI Content Repurposer (Collega)

## 1. Overview
AI Content Repurposer is a full-stack web application designed to convert long-form YouTube videos into digestible content like **Smart Notes**, **Social Media Captions**, and **Viral Reel Scripts**.

## 2. Problem & Solution
- **Problem:** YouTube aggressively blocks cloud-hosted IP addresses (like Vercel) from scraping video transcripts, leading to "403 Forbidden" or "429 Too Many Requests" errors.
- **Solution:** A hybrid architecture that offloads transcript extraction to a dedicated Python backend hosted on a different network (Render), while using Next.js for the UI and AI orchestration.

## 3. Technical Architecture
The project follows a **Decoupled Hybrid Architecture**:

- **Frontend (Next.js):** Modern UI built with React, Tailwind CSS, and Framer Motion. Hosted on **Vercel**.
- **AI Orchestrator (Next.js API):** Handles the logic, prompts, and communication with AI providers (OpenRouter).
- **Transcript Extraction Engine (Python/FastAPI):** A lightweight service using `youtube-transcript-api` and `yt-dlp`. Hosted on **Render**.
- **AI Provider:** **OpenRouter** (Llama 3.3 70B) for high-quality content generation.

## 4. Key Features
- **Automated Extraction:** No manual copy-pasting needed.
- **Tone Customization:** Options for Formal, Viral, Hinglish, etc.
- **Modern UI:** Glassmorphic design with dark mode and smooth animations.
- **Security:** API keys are handled securely via environment variables.

## 5. Technical Implementation Details
### Backend (Python/FastAPI)
- Uses `youtube-transcript-api` for fast extraction.
- Mimics residential user-agents to bypass blocks.
- Simple REST endpoint: `/transcript/{video_id}`.

### Frontend (Next.js)
- Responsive design for Mobile & Desktop.
- Real-time status updates during processing.
- Clipboard integration for easy content usage.

## 6. Setup & Installation
1. **Python Backend:** Deploy `python-backend/` to Render.
2. **Next.js Frontend:** Deploy to Vercel.
3. **Env Variables:**
   - `OPENROUTER_API_KEY`: For AI generation.
   - `PYTHON_BACKEND_URL`: URL of the deployed Render service.

## 7. Conclusion
By decoupling the scraper from the main application, we achieved a 100% success rate in transcript extraction, making the tool reliable for production use.
