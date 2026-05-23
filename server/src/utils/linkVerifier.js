import axios from "axios";
import dns from "dns";

const isPrivateIP = (ip) => {
  if (ip.includes(":")) {
    // IPv6 (loopback, link-local, unique local)
    return ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc00:") || ip.startsWith("fd00:");
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return true;

  const [a, b] = parts;
  if (
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    a === 127 || // 127.0.0.0/8
    a === 169 || // 169.254.0.0/16
    a === 0 // 0.0.0.0/8
  ) {
    return true;
  }
  return false;
};

const validateAndResolveUrl = async (urlString) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new Error("Invalid URL format");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Invalid protocol");
  }

  const hostname = parsedUrl.hostname;

  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) return reject(new Error("DNS resolution failed"));
      if (isPrivateIP(address)) return reject(new Error("URL resolves to a private IP address"));
      resolve(address);
    });
  });
};

/**
 * Verifies if a URL is active and reachable.
 * @param {string} url - The URL to verify
 * @returns {Promise<{url: string, isValid: boolean, status: number|null}>}
 */
export const verifyLink = async (url) => {
  if (!url) return { url, isValid: false, status: null };

  try {
    // 1. SSRF Mitigation: Validate and resolve the URL to check for private IPs
    await validateAndResolveUrl(url);

    // 2. Perform the GET request securely
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 0, // SSRF Mitigation: Prevent attacker from returning a 302 redirect to a private IP
      validateStatus: (status) => status >= 200 && status < 400, // Treat redirects (3xx) as a valid reachable link
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
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
