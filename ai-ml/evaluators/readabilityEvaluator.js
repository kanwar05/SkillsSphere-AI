import powerVerbs from "../data/powerVerbs.json" with { type: "json" };

/**
 * Advanced Readability Evaluator:
 * 1. Analyzes sentence structure for "Power Verbs"
 * 2. Identifies specific weak bullets (sentences missing action verbs)
 * 3. Detects passive voice
 */
export default function readabilityEvaluator({ resumeText = "", weight = 0.1 }) {
  // Clean bullet point prefixes from sentence start (fixes #230)
  // Handles common bullet characters from PDF extraction: •, –, *, en-dash, em-dash
  function cleanSentenceStart(sentence) {
    return sentence.replace(/^[\s\u2022\*\u2013\u2014•\-]+/, '').trim();
  }

  const sentences = resumeText
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Only analyze meaningful sentences

  const allPowerVerbs = Object.values(powerVerbs).flat().map(v => v.toLowerCase());
  
  const weakBullets = [];
  const passiveVoicePatterns = [
    /\b(?:is|are|was|were|be|been|being)\b\s+\b\w+ed\b/gi,
    /\bresponsible for\b/gi,
    /\bworked on\b/gi,
    /\btasks included\b/gi
  ];

  let powerVerbCount = 0;
  let passiveVoiceCount = 0;

  sentences.forEach(sentence => {
    // Clean bullet point prefixes before analysis (fixes #230)
    const cleanedSentence = cleanSentenceStart(sentence);
    const lowerSentence = cleanedSentence.toLowerCase();
    const words = lowerSentence.split(/\s+/);
    
    // Check for power verb at start or near start of sentence
    const hasPowerVerb = allPowerVerbs.some(verb => words.slice(0, 4).includes(verb));
    
    if (hasPowerVerb) {
      powerVerbCount++;
    } else {
      // It's a weak bullet if it doesn't start with an action verb
      weakBullets.push(sentence);
    }

    // Check for passive voice
    if (passiveVoicePatterns.some(pattern => pattern.test(lowerSentence))) {
      passiveVoiceCount++;
    }
  });

  // Dynamic Suggestions based on domain detection
  const suggestions = [];
  const isTechnical = /react|node|javascript|python|java|aws|sql/gi.test(resumeText);
  const relevantVerbs = isTechnical ? powerVerbs.technical : powerVerbs.management;

  if (passiveVoiceCount > 2) {
    suggestions.push("Rewrite passive phrases (e.g., 'Responsible for') with active power verbs.");
  }

  if (powerVerbCount / Math.max(1, sentences.length) < 0.5) {
    suggestions.push(`Strengthen your bullets using active verbs like: ${relevantVerbs.slice(0, 3).join(", ")}.`);
  }

  // Calculate score
  let score = 100;
  if (sentences.length > 0) {
     score -= (passiveVoiceCount * 5);
     const lowVerbDensity = (powerVerbCount / sentences.length) < 0.4;
     if (lowVerbDensity) score -= 20;
  }
  
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    key: "readability_match",
    label: "Readability & Impact",
    score: finalScore,
    weight,
    weightedScore: Math.round(finalScore * weight),
    summary: finalScore > 80 
      ? "Strong use of action verbs and active voice." 
      : "Some bullets are weak or use passive voice, which reduces the impact of your experience.",
    details: {
      powerVerbCount,
      passiveVoiceCount,
      suggestions,
      relevantVerbs: relevantVerbs,
    },
    meta: {
      sentenceCount: sentences.length,
      isTechnicalDomain: isTechnical
    }
  };
}