import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCloudPrompt,
  buildLocalTailoringPlanPrompt,
  cloudRequestContainsKnownPrivateValue,
  normalizeCloudTailoringRequest,
  pickBestMatch,
  parseLocalTailoringPlan,
  parseMatchResult,
  parseResumePatch
} from "../dist-test/prompts.js";

test("local tailoring plan must use exact job and resume excerpts", () => {
  const resume = {
    id: "business",
    label: "Business",
    professionalText: "Mapped current-state processes and led executive workshops."
  };
  const job = "Lead process transformation and executive workshops.";
  assert.match(buildLocalTailoringPlanPrompt(job, resume), /exact excerpts/);
  assert.equal(parseLocalTailoringPlan(JSON.stringify({
    professionalProfile: "Business process leader",
    skills: ["Process mapping"],
    jobRequirement: "executive workshops",
    sectionText: "Mapped current-state processes",
    verifiedEvidence: "led executive workshops",
    reason: "Direct fit"
  }), job, resume).jobRequirement, job);
  assert.throws(() => parseLocalTailoringPlan(JSON.stringify({
    professionalProfile: "Business process leader",
    skills: ["Process mapping"],
    jobRequirement: "executive workshops",
    sectionText: "Invented cloud architecture",
    verifiedEvidence: "led executive workshops",
    reason: "No"
  }), job, resume));
});

test("local tailoring plan resolves a close model phrase to exact source text", () => {
  const resume = {
    id: "business",
    label: "Business",
    professionalText: "Mapped current-state processes and led executive discovery workshops."
  };
  const job = "Lead process transformation and executive stakeholder workshops.";
  const plan = parseLocalTailoringPlan(JSON.stringify({
    professionalProfile: "Business process leader",
    skills: ["Process mapping"],
    jobRequirement: "Lead transformation and stakeholder workshops",
    sectionText: "Mapped processes and led discovery workshops",
    verifiedEvidence: "Led executive discovery workshops",
    reason: "Direct fit"
  }), job, resume);
  assert.equal(plan.jobRequirement, job);
  assert.equal(plan.sectionText, resume.professionalText);
  assert.equal(plan.verifiedEvidence, resume.professionalText);
});

test("local tailoring plan grounds one useful sentence from a long model response", () => {
  const resume = {
    id: "business",
    label: "Business",
    professionalText: "Mapped current-state processes and led executive discovery workshops. Built unrelated dashboards."
  };
  const job = "Lead process transformation and executive stakeholder workshops. Manage a global roadmap.";
  const longResponse = "General context about the company and role. Lead transformation through executive stakeholder workshops. More unrelated context.";
  const plan = parseLocalTailoringPlan(JSON.stringify({
    professionalProfile: "Business process leader",
    skills: ["Process mapping"],
    jobRequirement: longResponse,
    sectionText: `Background summary. ${resume.professionalText}`,
    verifiedEvidence: "Evidence: mapped current-state processes and led executive discovery workshops.",
    reason: "Direct fit"
  }), job, resume);
  assert.equal(plan.jobRequirement, "Lead process transformation and executive stakeholder workshops.");
  assert.equal(plan.sectionText, "Mapped current-state processes and led executive discovery workshops.");
});

test("local tailoring plan does not send a broken job-page fragment", () => {
  const resume = {
    id: "business",
    label: "Business",
    professionalText: "Defined modernization roadmaps and target-state architectures for enterprise platforms."
  };
  const job = "Help define target operating models and capability designs: what the platform must do,\nwhat stays manual for launch,\nand what is reusable globally.";
  const plan = parseLocalTailoringPlan(JSON.stringify({
    professionalProfile: "Business architect",
    skills: ["Capability design"],
    jobRequirement: "what stays manual for launch and what is reusable globally",
    sectionText: resume.professionalText,
    verifiedEvidence: resume.professionalText,
    reason: "Direct fit"
  }), job, resume);
  assert.equal(plan.jobRequirement, job.replace(/\n+/g, " "));
});

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

