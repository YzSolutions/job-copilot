import type { CandidateVault } from "./vault.js";

export type ApplicationField = {
  index: number;
  signature: string;
  label: string;
  name: string;
  id: string;
  autocomplete: string;
  type: string;
  value: string;
  options: string[];
};

export type AutofillEntry = {
  index: number;
  signature: string;
  label: string;
  value: string;
};

const blockedQuestion = /veteran|disab|gender|\bsex\b|race|ethnic|pronoun|birth|\bdob\b|social.?security|\bssn\b|marital|religion|national origin|eeo|equal employment/i;

export function normalizeApplicationFields(value: unknown): ApplicationField[] {
  return Array.isArray(value) ? value.filter((field): field is ApplicationField =>
    field && typeof field === "object"
    && Number.isInteger(field.index)
    && ["signature", "label", "name", "id", "autocomplete", "type", "value"].every((key) => typeof field[key] === "string")
    && Array.isArray(field.options) && field.options.every((option: unknown) => typeof option === "string")
  ).slice(0, 200).map((field) => ({
    ...field,
    signature: field.signature.slice(0, 700),
    label: field.label.slice(0, 200),
    name: field.name.slice(0, 200),
    id: field.id.slice(0, 200),
    autocomplete: field.autocomplete.slice(0, 100),
    type: field.type.slice(0, 50),
    value: field.value.slice(0, 200),
    options: field.options.slice(0, 100).map((option) => option.slice(0, 200))
  })) : [];
}

export function buildAutofillPlan(fields: ApplicationField[], vault: CandidateVault): AutofillEntry[] {
  const names = vault.fullName.split(/\s+/).filter(Boolean);
  const firstName = names[0] ?? "";
  const lastName = names.slice(1).join(" ");
  const values: Array<[RegExp, string]> = [
    [/linkedin/, vault.linkedInUrl],
    [/(^|\b)(first|given)[ _-]*name(\b|$)/, firstName],
    [/(^|\b)(last|family|sur)[ _-]*name(\b|$)/, lastName],
    [/e-?mail/, vault.email],
    [/phone|mobile|telephone|\btel\b/, vault.phone],
    [/street|address.?line.?1|address1/, vault.streetAddress],
    [/(^|\b)city(\b|$)|address.?level.?2/, vault.city],
    [/(^|\b)state(\b|$)|province|address.?level.?1/, vault.state],
    [/postal|zip/, vault.postalCode],
    [/work.?auth|authorized to work|legally authorized/, vault.workAuthorization],
    [/sponsor/, vault.sponsorship],
    [/clearance/, vault.clearance],
    [/salary|compensation|pay expectation/, vault.desiredSalary],
    [/start date|available.*start|availability date/, vault.availableStartDate],
    [/relocat/, vault.willingToRelocate],
    [/travel/, vault.travelPreference]
  ];
  const autocompleteValues: Record<string, string> = {
    name: vault.fullName,
    "given-name": firstName,
    "family-name": lastName,
    email: vault.email,
    tel: vault.phone,
    "street-address": vault.streetAddress,
    "address-line1": vault.streetAddress,
    "address-level2": vault.city,
    "address-level1": vault.state,
    "postal-code": vault.postalCode
  };

  return fields.flatMap((field) => {
    if (field.value || blockedQuestion.test(`${field.label} ${field.name} ${field.id}`)) return [];
    const combined = `${field.autocomplete} ${field.label} ${field.name} ${field.id}`.toLocaleLowerCase();
    const exactName = [field.label, field.name, field.id]
      .map((item) => item.trim().toLocaleLowerCase().replace(/[_-]+/g, " "))
      .some((item) => ["name", "full name", "fullname", "candidate name", "applicant name"].includes(item));
    const value = autocompleteValues[field.autocomplete.toLocaleLowerCase()]
      || (exactName ? vault.fullName : "")
      || values.find(([pattern]) => pattern.test(combined))?.[1]
      || "";
    return value ? [{ index: field.index, signature: field.signature, label: field.label, value }] : [];
  }).slice(0, 50);
}
