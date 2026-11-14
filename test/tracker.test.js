import test from "node:test";
import assert from "node:assert/strict";
import { attachApplicationResume, normalizeTrackedApplications, recordApplication, updateApplicationStatus } from "../dist-test/tracker.js";

const job = {
  title: "Business Architect",
  company: "Example Co",
  description: "Lead business architecture work.",
  sourceUrl: "https://example.com/jobs/123"
};

test("application tracker records a job once and preserves its later status", () => {
  const first = recordApplication([], job, "2026-11-14T12:00:00.000Z");
  const interviewed = updateApplicationStatus(first, first[0].id, "Interview", "2026-11-15T12:00:00.000Z");
  const repeated = recordApplication(interviewed, { ...job, title: "Senior Business Architect" }, "2026-11-16T12:00:00.000Z");
  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].title, "Senior Business Architect");
  assert.equal(repeated[0].status, "Interview");
  assert.equal(repeated[0].createdAt, "2026-11-14T12:00:00.000Z");
});

test("application tracker rejects malformed records and unsupported statuses", () => {
  const valid = recordApplication([], job, "2026-11-14T12:00:00.000Z")[0];
  const normalized = normalizeTrackedApplications([valid, valid, { ...valid, id: "second" }, { ...valid, id: "bad", status: "Hired automatically" }, { unsafe: true }]);
  assert.equal(normalized.length, 2);
  assert.deepEqual(updateApplicationStatus(normalized, valid.id, "Unknown", "2026-11-15T12:00:00.000Z"), normalized);
});

test("application tracker links the generated résumé to the matching job", () => {
  const recorded = recordApplication([], job, "2026-11-14T12:00:00.000Z");
  const attached = attachApplicationResume(recorded, job, "Business_Architect_Tailored.docx", "2026-11-14T13:00:00.000Z");
  assert.equal(attached[0].resumeFileName, "Business_Architect_Tailored.docx");
  assert.deepEqual(attachApplicationResume(attached, { ...job, sourceUrl: "https://example.com/jobs/other" }, "Other.docx", "2026-11-14T14:00:00.000Z"), attached);
});
