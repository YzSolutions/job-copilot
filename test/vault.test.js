import test from "node:test";
import assert from "node:assert/strict";
import {
  completedVaultFields,
  missingCandidateVaultFields,
  normalizeCandidateVault
} from "../dist-test/vault.js";

test("candidate vault keeps only normalized local fields", () => {
  const vault = normalizeCandidateVault({
    fullName: "  Test Candidate  ",
    sponsorship: "No",
    unexpectedCloudField: "must be dropped",
    phone: 123
  });
  assert.equal(vault.fullName, "Test Candidate");
  assert.equal(vault.sponsorship, "No");
  assert.equal(vault.phone, "");
  assert.equal("unexpectedCloudField" in vault, false);
  assert.equal(completedVaultFields(vault), 2);
});

test("candidate vault identifies the remaining local questions", () => {
  const vault = normalizeCandidateVault({ fullName: "Test Candidate", email: "test@example.com" });
  assert.ok(missingCandidateVaultFields(vault).includes("phone"));
  assert.ok(missingCandidateVaultFields(vault).includes("salary target"));
  assert.ok(missingCandidateVaultFields(vault).includes("LinkedIn URL"));
});

test("candidate vault limits stored field length", () => {
  assert.equal(normalizeCandidateVault({ fullName: "x".repeat(250) }).fullName.length, 200);
});
