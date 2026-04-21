# 🚀 Setup Guide - AI Content Repurposer

This guide will help you get the project running on any new machine.

## 📋 Prerequisites

You need the following installed on your system:

1.  **Node.js (v18.x or later)**
    *   Download: [nodejs.org](https://nodejs.org/)
    *   Verify: `node -v`

2.  **Python (v3.10.x or later)**
    *   Download: [python.org](https://www.python.org/)
    *   **Important:** Check the box "Add Python to PATH" during installation.
    *   Verify: `python --version`

3.  **FFmpeg**
    *   Essential for video processing.
    *   Installation:
        *   **Windows:** Download build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), extract, and add the `bin` folder to your System PATH.
        *   **Mac:** `brew install ffmpeg`
        *   **Linux:** `sudo apt install ffmpeg`
    *   Verify: `ffmpeg -version`

## 🛠️ Installation Steps

1.  **Extract the Project:**
    Copy the project folder to your desired location.

2.  **Install Node Dependencies:**
    Open a terminal in the project root and run:
    ```bash
    npm install
    ```

3.  **Install Python Dependencies:**
    Run the following command to install the video downloader:
    ```bash
    pip install yt-dlp
    ```

## 🚀 Running the Application

To start the development server:
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

## 🔑 Configuration

The app requires an AI API Key (Gemini, Groq, or OpenRouter) to function. You can enter this directly in the application's user interface after it starts.

---

###  Troubleshooting
*   **Transcript Error:** Ensure the YouTube video has Closed Captions (CC) enabled.
*   **Clip Generation Error:** Ensure FFmpeg is correctly added to your system's PATH variables.
*   **Python Command:** If `python` doesn't work, try using `python3`.
