export type CandidateVault = {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  workAuthorization: string;
  sponsorship: string;
  clearance: string;
};

export const emptyCandidateVault: CandidateVault = {
  fullName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  workAuthorization: "",
  sponsorship: "",
  clearance: ""
};

export function normalizeCandidateVault(value: unknown): CandidateVault {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(emptyCandidateVault).map((key) => [
    key,
    typeof source[key] === "string" ? source[key].trim().slice(0, 200) : ""
  ])) as CandidateVault;
}

export function completedVaultFields(vault: CandidateVault): number {
  return Object.values(vault).filter(Boolean).length;
}
