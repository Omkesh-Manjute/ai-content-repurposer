// src/services/api.js
const BASE_URL = 'https://ai-content-repurposer-production-1b9a.up.railway.app';

function isValidYouTubeUrl(url) {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)/.test(url);
}

function extractVideoId(url) {
  try {
    const u = new URL(url);

    // youtube.com (watch?v=, live/, shorts/, embed/)
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      
      const parts = u.pathname.split("/").filter(Boolean);
      return parts.pop();
    }

    // youtu.be/
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
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
    console.log("API RESPONSE (Railway):", data);
    
    if (!data || !data.transcript) {
      throw new Error("Transcript not available for this video");
    }

    return data;

  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
