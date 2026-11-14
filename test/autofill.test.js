import test from "node:test";
import assert from "node:assert/strict";
import { buildAutofillPlan, normalizeApplicationFields } from "../dist-test/autofill.js";
import { normalizeCandidateVault } from "../dist-test/vault.js";

const field = (index, label, value = "", autocomplete = "") => ({
  index,
  signature: `${index}|INPUT|field-${index}||text`,
  label,
  name: "",
  id: `field-${index}`,
  autocomplete,
  type: "text",
  value,
  options: []
});

test("autofill uses local contact details without overwriting answers", () => {
  const vault = normalizeCandidateVault({ fullName: "Yahya Zia", email: "yahyazia@gmail.com", phone: "2158882648" });
  const plan = buildAutofillPlan([
    field(0, "First name", "", "given-name"),
    field(1, "Last name", "", "family-name"),
    field(2, "Email", "already@example.com", "email"),
    field(3, "Phone", "", "tel")
  ], vault);
  assert.deepEqual(plan.map(({ label, value }) => ({ label, value })), [
    { label: "First name", value: "Yahya" },
    { label: "Last name", value: "Zia" },
    { label: "Phone", value: "2158882648" }
  ]);
});

test("autofill excludes sensitive and ambiguous fields", () => {
  const vault = normalizeCandidateVault({ fullName: "Yahya Zia", state: "MD" });
  const plan = buildAutofillPlan([
    field(0, "Veteran status"),
    field(1, "Disability status"),
    field(2, "Company name"),
    field(3, "State")
  ], vault);
  assert.deepEqual(plan.map(({ label }) => label), ["State"]);
});

test("application field input is normalized and capped", () => {
  const fields = normalizeApplicationFields([field(0, "Email"), { unsafe: true }, ...Array.from({ length: 250 }, (_, index) => field(index + 1, "Phone"))]);
  assert.equal(fields.length, 200);
  assert.equal(fields[0].label, "Email");
});
