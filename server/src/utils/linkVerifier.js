import axios from "axios";

/**
 * Verifies if a URL is active and reachable.
 * @param {string} url - The URL to verify
 * @returns {Promise<{url: string, isValid: boolean, status: number|null}>}
 */
export const verifyLink = async (url) => {
  if (!url) return { url, isValid: false, status: null };

  try {
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      // We only care about headers, but some sites block HEAD requests
      method: "GET", 
    });

    return {
      url,
      isValid: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error) {
    // Handle cases where the site exists but blocks automated GETs (like LinkedIn)
    // If it's a 403 or 429, we still consider it "potentially valid" if it's a known domain
    const isBotProtected = error.response && [403, 429, 999].includes(error.response.status);
    
    return {
      url,
      isValid: isBotProtected,
      status: error.response?.status || null,
      error: error.message
    };
  }
};

/**
 * Verifies multiple links in parallel.
 * @param {string[]} urls 
 */
export const verifyLinks = async (urls = []) => {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const results = await Promise.all(uniqueUrls.map(url => verifyLink(url)));
  return results;
};
