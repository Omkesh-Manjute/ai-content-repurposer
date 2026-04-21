// src/services/api.js
const BASE_URL = 'https://your-backend.onrender.com';

/**
 * Generate summarized content from a YouTube URL
 * @param {string} url - The YouTube Video URL
 * @returns {Promise<Object>} JSON response from the API
 */
export const generateContent = async (url) => {
  try {
    const response = await fetch(`/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      // Trying to parse standard error message if provided by backend
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
