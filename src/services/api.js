// src/services/api.js
const BASE_URL = 'https://ai-content-repurposer-production-1b9a.up.railway.app';

function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
}

/**
 * Generate summarized content from a YouTube URL
 * @param {string} url - The YouTube Video URL
 * @returns {Promise<Object>} JSON response from the API
 */
export const generateContent = async (url) => {
  try {
    const videoId = extractVideoId(url);

    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    const response = await fetch(
      `${BASE_URL}/transcript/${videoId}`
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.transcript) {
      throw new Error("No transcript found");
    }

    return data;

  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
