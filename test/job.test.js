import test from "node:test";
import assert from "node:assert/strict";
import {
  currentJobPrompt,
  extractCurrentJob,
  normalizeCurrentJob
} from "../dist-test/job.js";

test("job extraction prefers structured JobPosting data", () => {
  const job = extractCurrentJob({
    url: "https://example.com/jobs/123",
    h1: "Fallback title",
    visibleText: "Fallback description",
    jsonLd: [JSON.stringify({
      "@type": "JobPosting",
      title: "Director, Transformation",
      hiringOrganization: { name: "Northstar Health" },
      description: "<p>Lead &amp; improve <strong>business processes</strong>.</p>"
    })]
  });
  assert.deepEqual(job, {
    title: "Director, Transformation",
    company: "Northstar Health",
    description: "Lead & improve business processes .",
    sourceUrl: "https://example.com/jobs/123"
  });
});

test("job extraction falls back to visible page content", () => {
  const job = extractCurrentJob({
    url: "https://example.com/job",
    h1: "Business Architect",
    companyText: "Example Consulting",
    visibleText: "Map current-state processes and lead stakeholder workshops.",
    jsonLd: ["not valid json"]
  });
  assert.match(currentJobPrompt(job), /Business Architect[\s\S]*Example Consulting[\s\S]*current-state/);
});

test("job extraction recognizes company names in Greenhouse page titles", () => {
  const job = extractCurrentJob({
    url: "https://job-boards.greenhouse.io/example/jobs/123",
    pageTitle: "Job Application for Senior Business Architect at Alpaca",
    h1: "Senior Business Architect",
    visibleText: "Lead business architecture and requirements discovery."
  });
  assert.equal(job.company, "Alpaca");
});

test("job normalization rejects unsafe source URLs and limits page text", () => {
  const job = normalizeCurrentJob({ description: "x".repeat(25000), sourceUrl: "javascript:alert(1)" });
  assert.equal(job.description.length, 20000);
  assert.equal(job.sourceUrl, "");
});
