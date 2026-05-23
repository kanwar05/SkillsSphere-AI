import test from "node:test";
import assert from "node:assert/strict";
import { skillEvaluator } from "../skillEvaluator.js";

test("perfect match returns 100 score and no missing skills", () => {
  const result = skillEvaluator({
    resumeSkills: ["React", "Node.js"],
    jobSkills: ["react", "node.js"],
  });

  assert.equal(result.score, 100);
  assert.deepEqual(result.details.missingSkills, []);
  assert.deepEqual(result.details.matchedSkills, ["react", "nodejs"]);
});

test("partial match includes missing and extra skills", () => {
  const result = skillEvaluator({
    resumeSkills: ["React", "MongoDB", "Node.js"],
    jobSkills: ["React", "MongoDB", "Docker", "AWS"],
  });

  assert.equal(result.score, 50);
  assert.deepEqual(result.details.matchedSkills, ["react", "mongodb"]);
  assert.deepEqual(result.details.missingSkills, ["docker", "aws"]);
  assert.deepEqual(result.details.extraSkills, ["nodejs"]);
});

test("no match with duplicates dedupes and avoids false positives", () => {
  const result = skillEvaluator({
    resumeSkills: ["Python", "python", "  PYTHON  "],
    jobSkills: ["React", "Node.js", "react"],
  });

  assert.equal(result.score, 0);
  assert.deepEqual(result.details.matchedSkills, []);
  assert.deepEqual(result.details.missingSkills, ["react", "nodejs"]);
  assert.deepEqual(result.details.extraSkills, ["python"]);
});

test("empty job skills avoids division by zero", () => {
  const result = skillEvaluator({
    resumeSkills: ["React"],
    jobSkills: [],
  });

  assert.equal(result.score, 0);
  assert.ok(result.details.feedback.includes("No job skills provided for comparison"));
});
