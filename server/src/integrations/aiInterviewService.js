/**
 * AI Interview Service Integration
 *
 * Handles communication with the Python AI microservice for:
 * - Speech-to-text (audio transcription via faster-whisper)
 * - Answer evaluation (semantic similarity + concept detection)
 *
 * Falls back to mock responses when the Python service is unavailable.
 */

const AI_SERVICE_URL =
  process.env.INTERVIEW_AI_URL || "http://localhost:8000";

/**
 * Check if the Python AI service is available.
 */
const isServiceAvailable = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Generate mock evaluation scores when the Python service is unavailable.
 * Uses basic keyword matching as a simple fallback.
 */
const mockEvaluate = (transcript, expectedAnswer, expectedConcepts) => {
  const transcriptLower = transcript.toLowerCase();
  const expectedLower = expectedAnswer.toLowerCase();

  // Simple keyword overlap for technical score
  const expectedWords = expectedLower.split(/\s+/).filter((w) => w.length > 3);
  const matchedWords = expectedWords.filter((w) => transcriptLower.includes(w));
  const technical = Math.min(
    100,
    Math.round((matchedWords.length / Math.max(expectedWords.length, 1)) * 100)
  );

  // Concept detection via keyword matching
  const detected = expectedConcepts.filter((c) =>
    transcriptLower.includes(c.replace(/-/g, " ").toLowerCase())
  );
  const missed = expectedConcepts.filter((c) => !detected.includes(c));
  const relevance = Math.round(
    (detected.length / Math.max(expectedConcepts.length, 1)) * 100
  );

  // Basic communication score based on answer length
  const wordCount = transcript.split(/\s+/).length;
  let communication = 50;
  if (wordCount > 20 && wordCount < 300) communication = 70;
  if (wordCount > 50 && wordCount < 200) communication = 85;

  // Count filler words
  const fillers = ["um", "uh", "like", "you know", "basically", "actually", "so yeah"];
  const fillerCount = fillers.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    return count + (transcriptLower.match(regex) || []).length;
  }, 0);

  return {
    technical,
    communication: Math.max(0, communication - fillerCount * 5),
    relevance,
    concepts: { detected, missed },
    fillerWords: fillerCount,
    speakingSpeed: wordCount < 30 ? "slow" : wordCount > 150 ? "fast" : "normal",
  };
};

/**
 * Send audio to the Python service for transcription.
 * Falls back with an error if the service is unavailable.
 */
export const transcribeAudio = async (audioBuffer) => {
  const available = await isServiceAvailable();

  if (!available) {
    throw new Error(
      "AI transcription service is not available. Please submit text instead."
    );
  }

  const formData = new FormData();
  formData.append("audio", new Blob([audioBuffer]), "audio.webm");

  const res = await fetch(`${AI_SERVICE_URL}/api/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Transcription failed with status ${res.status}`);
  }

  return res.json();
};

/**
 * Send transcript to the Python service for evaluation.
 * Falls back to mock evaluation if the service is unavailable.
 */
export const evaluateAnswer = async (
  transcript,
  expectedAnswer,
  expectedConcepts
) => {
  const available = await isServiceAvailable();

  if (!available) {
    console.log(
      "[aiInterviewService] Python service unavailable, using mock evaluation"
    );
    return mockEvaluate(transcript, expectedAnswer, expectedConcepts);
  }

  const res = await fetch(`${AI_SERVICE_URL}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, expectedAnswer, expectedConcepts }),
  });

  if (!res.ok) {
    console.log(
      `[aiInterviewService] Evaluation failed (${res.status}), using mock`
    );
    return mockEvaluate(transcript, expectedAnswer, expectedConcepts);
  }

  return res.json();
};
