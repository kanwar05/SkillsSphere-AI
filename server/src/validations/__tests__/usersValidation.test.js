import assert from "node:assert/strict";
import test from "node:test";
import { updateProfileSchema } from "../users.validation.js";

test("updateProfileSchema accepts bare company website domains", () => {
  const result = updateProfileSchema.safeParse({
    name: "Recruiter User",
    companyWebsite: "example.com",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.companyWebsite, "example.com");
});

test("updateProfileSchema accepts www company website domains", () => {
  const result = updateProfileSchema.safeParse({
    name: "Recruiter User",
    companyWebsite: "www.example.com",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.companyWebsite, "www.example.com");
});

test("updateProfileSchema accepts full https company website URLs", () => {
  const result = updateProfileSchema.safeParse({
    name: "Recruiter User",
    companyWebsite: "https://example.com",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.companyWebsite, "https://example.com");
});

test("updateProfileSchema rejects invalid company website strings", () => {
  const result = updateProfileSchema.safeParse({
    name: "Recruiter User",
    companyWebsite: "not a website",
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.join("."), "companyWebsite");
  assert.equal(result.error.issues[0].message, "Invalid URL");
});

test("updateProfileSchema keeps empty company website values valid for clearing profile data", () => {
  const result = updateProfileSchema.safeParse({
    name: "Recruiter User",
    companyWebsite: "",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.companyWebsite, "");
});
