import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCloudPrompt,
  cloudRequestContainsKnownPrivateValue,
  normalizeCloudTailoringRequest,
  pickBestMatch,
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

test("cloud request excludes unexpected candidate data", () => {
  const request = normalizeCloudTailoringRequest({
    jobRequirements: "Lead process transformation",
    sectionText: "Business analyst",
    verifiedEvidence: "Mapped current-state processes",
    email: "private@example.com",
    address: "Private address"
  });
  assert.deepEqual(Object.keys(request), ["jobRequirements", "sectionId", "sectionText", "verifiedEvidence"]);
  assert.doesNotMatch(buildCloudPrompt(request), /private@example|Private address/);
});

test("cloud request blocks known private vault values", () => {
  const request = normalizeCloudTailoringRequest({
    jobRequirements: "Lead process transformation",
    sectionText: "Business analyst at private@example.com",
    verifiedEvidence: "Mapped current-state processes"
  });
  assert.equal(cloudRequestContainsKnownPrivateValue(request, ["private@example.com"]), true);
  assert.equal(cloudRequestContainsKnownPrivateValue(request, ["unrelated@example.com"]), false);
  assert.equal(cloudRequestContainsKnownPrivateValue({ ...request, jobRequirements: "Public Trust required" }, ["Public Trust"]), false);
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

test("patch parser rejects a changed original section", () => {
  assert.throws(() => parseResumePatch(JSON.stringify({
    sectionId: "selected-section",
    originalText: "Changed",
    proposedText: "Improved",
    reason: "Relevant"
  }), "selected-section", "Original"));
});

test("best match keeps the highest locally produced score", () => {
  assert.equal(pickBestMatch([
    { recommendedResumeId: "business", score: 84, reason: "A", missingRequirements: [] },
    { recommendedResumeId: "healthcare", score: 91, reason: "B", missingRequirements: [] }
  ]).recommendedResumeId, "healthcare");
});

