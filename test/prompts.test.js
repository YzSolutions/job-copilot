import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCloudPrompt,
  parseMatchResult,
  parseResumePatch
} from "../dist-test/prompts.js";

test("cloud prompt includes only the explicitly supplied professional section", () => {
  const prompt = buildCloudPrompt({
    jobRequirements: "Lead process transformation",
    sectionId: "summary",
    sectionText: "Business analyst",
    verifiedEvidence: "Mapped current-state processes"
  });
  assert.match(prompt, /Business analyst/);
  assert.doesNotMatch(prompt, /phone|address|veteran|citizenship/i);
});

test("match parser rejects an unknown resume", () => {
  assert.throws(() => parseMatchResult(JSON.stringify({
    recommendedResumeId: "unknown",
    score: 90,
    reason: "No",
    missingRequirements: []
  }), ["known"]));
});

test("match parser normalizes a fractional model score to 100 points", () => {
  assert.equal(parseMatchResult(JSON.stringify({
    recommendedResumeId: "known",
    score: 0.9,
    reason: "Strong match",
    missingRequirements: []
  }), ["known"]).score, 90);
});

test("patch parser binds the response to the requested section", () => {
  assert.throws(() => parseResumePatch(JSON.stringify({
    sectionId: "experience",
    originalText: "A",
    proposedText: "B",
    reason: "C"
  }), "summary"));
});

