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
  linkedInUrl: string;
  desiredSalary: string;
  availableStartDate: string;
  willingToRelocate: string;
  travelPreference: string;
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
  clearance: "",
  linkedInUrl: "",
  desiredSalary: "",
  availableStartDate: "",
  willingToRelocate: "",
  travelPreference: ""
};

export const candidateVaultQuestionLabels: Record<keyof CandidateVault, string> = {
  fullName: "full name",
  email: "application email",
  phone: "phone",
  streetAddress: "street address",
  city: "city",
  state: "state",
  postalCode: "postal code",
  workAuthorization: "work authorization",
  sponsorship: "sponsorship",
  clearance: "clearance",
  linkedInUrl: "LinkedIn URL",
  desiredSalary: "salary target",
  availableStartDate: "available start date",
  willingToRelocate: "relocation preference",
  travelPreference: "travel preference"
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

export function missingCandidateVaultFields(vault: CandidateVault): string[] {
  return (Object.keys(candidateVaultQuestionLabels) as Array<keyof CandidateVault>)
    .filter((key) => !vault[key])
    .map((key) => candidateVaultQuestionLabels[key]);
}
