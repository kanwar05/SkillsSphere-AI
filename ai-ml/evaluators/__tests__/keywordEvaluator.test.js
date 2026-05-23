import test from "node:test";
import assert from "node:assert/strict";
import { keywordEvaluator } from "../keywordEvaluator.js";

test("partial keyword overlap matches normalized keywords", () => {
  const result = keywordEvaluator({
    resumeText: "Experienced React and Node.js developer with MongoDB knowledge",
    jobDescription: "Looking for React, Node.js, MongoDB, Docker and AWS experience",
  });

  // React, Node.js, MongoDB match -> 3/5 = 60
  assert.equal(result.score, 60);
  assert.ok(result.details.matchedKeywords.includes("react"));
  assert.ok(result.details.matchedKeywords.includes("nodejs"));
  assert.ok(result.details.matchedKeywords.includes("mongodb"));
  assert.ok(result.details.missingKeywords.includes("docker"));
  assert.ok(result.details.missingKeywords.includes("aws"));
});

test("strong keyword coverage returns high score", () => {
  const result = keywordEvaluator({
    resumeText: "We use React, Node.js, MongoDB, Docker, and AWS daily.",
    jobDescription: "Need React, Node.js, MongoDB, Docker, AWS.",
  });

  assert.equal(result.score, 100);
  assert.deepEqual(result.details.missingKeywords, []);
  assert.ok(result.details.feedback.some(f => f.includes("Excellent keyword alignment")));
});

test("low overlap returns low score", () => {
  // Use keywords that are likely in techKeywords.json (from previous research)
  const result = keywordEvaluator({
    resumeText: "General office assistant with strong communication skills",
    jobDescription: "Kubernetes, Terraform, Docker, AWS, and Python required",
  });

  assert.ok(result.score < 50);
  assert.ok(result.details.feedback.some(f => f.includes("missing many key industry keywords")));
  assert.equal(result.details.matchedKeywords.length, 0);
  // Kubernetes, Terraform, Docker, AWS, Python are all technical keywords
  assert.ok(result.details.missingKeywords.length >= 3); 
});

test("score is capped at 100", () => {
  const result = keywordEvaluator({
    resumeText: "React and Node developer",
    jobDescription: "React and Node",
  });

  assert.equal(result.score, 100);
});
