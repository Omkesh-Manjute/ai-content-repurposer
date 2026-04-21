const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;

// Paths (portable setup)
const ytdlp = path.join(__dirname, "../tools/yt-dlp.exe");
const ffmpeg = path.join(__dirname, "../ffmpeg/bin/ffmpeg.exe");

// Ensure clips folder exists
const fs = require("fs");
const clipsDir = path.join(__dirname, "../clips");
if (!fs.existsSync(clipsDir)) {
  fs.mkdirSync(clipsDir);
}

// API
app.post("/clip", (req, res) => {
  const { url, start, end } = req.body;

  if (!url || !start || !end) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const output = `clip_${Date.now()}.mp4`;
  const outputPath = path.join(clipsDir, output);

  const command = `
  "${ytdlp}" -o temp.mp4 "${url}" &&
  "${ffmpeg}" -ss ${start} -to ${end} -i temp.mp4 -c copy "${outputPath}"
  `;

  console.log("Running:", command);

  exec(command, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Processing failed" });
    }

    res.json({
      status: "success",
      file: output
    });
  });
});

// Home route
app.get("/", (req, res) => {
  res.send(`
    <h2>AI Video Clipper</h2>
    <input id="url" placeholder="YouTube URL"><br><br>
    <input id="start" placeholder="Start (sec)"><br><br>
    <input id="end" placeholder="End (sec)"><br><br>
    <button onclick="clip()">Clip</button>

    <script>
      async function clip() {
        const res = await fetch('/clip', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            url: document.getElementById('url').value,
            start: document.getElementById('start').value,
            end: document.getElementById('end').value
          })
        });

        const data = await res.json();
        alert(JSON.stringify(data));
      }
    </script>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
