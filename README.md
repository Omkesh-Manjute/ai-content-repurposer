# Collega - AI Content Repurposer 🧠🎬

Collega is a powerful tool that transforms YouTube videos into structured notes, social media captions, and viral reel scripts using AI.

## 🚀 Key Features
- **Smart Summarization:** Get structured notes from any long video.
- **Content Creation:** Automatically generate Reel scripts and captions.
- **Hinglish Support:** Generate content in native Hinglish/Hindi tones.
- **Robust Extraction:** Uses a dedicated Python backend to bypass YouTube's IP blocks.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion
- **AI Backend:** OpenRouter (Llama 3.3 70B)
- **Scraper Backend:** Python (FastAPI), Hosted on Render
- **Hosting:** Vercel (Frontend), Render (Scraper)

## 🏗️ Architecture
1. **User** enters a YouTube URL in the Next.js UI.
2. **Next.js** calls the **Python Scraper (Render)** to fetch the transcript.
3. **Python Scraper** returns the transcript text.
4. **Next.js** sends the transcript + prompt to **OpenRouter AI**.
5. **AI** returns structured content displayed to the user.

## 📦 Installation & Setup

### 1. Python Scraper (Render)
1. Deploy the `python-backend` folder to Render.com.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`

### 2. Next.js App (Vercel)
1. Set up your `.env` file:
   ```env
   OPENROUTER_API_KEY=your_key_here
   PYTHON_BACKEND_URL=your_render_url_here
   ```
2. Run locally:
   ```bash
   npm install
   npm run dev
   ```

## 📄 License
MIT License
