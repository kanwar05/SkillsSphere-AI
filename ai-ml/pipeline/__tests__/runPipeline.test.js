import assert from "node:assert/strict";
import test from "node:test";
import { runPipeline } from "../runPipeline.js";

test("validates evaluator outputs and aggregates successful results", async () => {
  const result = await runPipeline({
    resumeData: {
      resumeText: "Experienced JavaScript developer with 5 years in React and Node.js.",
      skills: ["JavaScript", "React", "Node.js"],
      experience: [
        { title: "Developer", company: "TechCorp", duration: "2020-2023", description: "Wrote code" }
      ],
      classification: { field: "frontend developer" }
    },
    jobSkills: ["JavaScript", "React"],
    jobDescription: "Looking for a JS and React developer."
  });

  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.degraded, "boolean");
  assert.ok("gapAnalysis" in result);
  assert.ok("classification" in result);
});

test("handles missing job description gracefully (benchmark mode)", async () => {
  const result = await runPipeline({
    resumeData: {
      resumeText: "JavaScript developer",
      skills: ["JavaScript", "Node.js"],
      classification: { field: "backend developer" }
    }
  });

  assert.equal(typeof result.score, "number");
  assert.equal(result.mode, "benchmark");
});
