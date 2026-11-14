import { normalizeCurrentJob, type CurrentJob } from "./job.js";

export const applicationStatuses = ["Applied", "Recruiter screen", "Interview", "Offer", "Rejected", "Withdrawn"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];

export type TrackedApplication = {
  id: string;
  title: string;
  company: string;
  sourceUrl: string;
  status: ApplicationStatus;
  resumeFileName?: string;
  createdAt: string;
  updatedAt: string;
};

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function validTimestamp(value: unknown): string {
  const timestamp = clean(value, 40);
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : "";
}

export function normalizeTrackedApplications(value: unknown): TrackedApplication[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const source = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const id = clean(source.id, 2000);
    const title = clean(source.title, 300);
    const company = clean(source.company, 300);
    const sourceUrl = clean(source.sourceUrl, 2000);
    const createdAt = validTimestamp(source.createdAt);
    const updatedAt = validTimestamp(source.updatedAt);
    const resumeFileName = clean(source.resumeFileName, 200);
    const status = applicationStatuses.includes(source.status as ApplicationStatus) ? source.status as ApplicationStatus : undefined;
    if (!id || !title || !createdAt || !updatedAt || !status || seen.has(id)) return [];
    seen.add(id);
    return [{ id, title, company, sourceUrl: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : "", status, ...(resumeFileName ? { resumeFileName } : {}), createdAt, updatedAt }];
  }).slice(0, 500);
}

export function recordApplication(applications: TrackedApplication[], jobValue: CurrentJob, now: string): TrackedApplication[] {
  const job = normalizeCurrentJob(jobValue);
  const timestamp = validTimestamp(now);
  if (!job.title || !timestamp) throw new Error("Save a job title before recording the application.");
  const id = (job.sourceUrl || `${job.title}\n${job.company}`).toLocaleLowerCase().slice(0, 2000);
  const existing = applications.find((application) => application.id === id);
  const record: TrackedApplication = {
    id,
    title: job.title,
    company: job.company,
    sourceUrl: job.sourceUrl,
    status: existing?.status ?? "Applied",
    ...(existing?.resumeFileName ? { resumeFileName: existing.resumeFileName } : {}),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };
  return [record, ...applications.filter((application) => application.id !== id)].slice(0, 500);
}

export function attachApplicationResume(applications: TrackedApplication[], jobValue: CurrentJob, fileName: string, now: string): TrackedApplication[] {
  const job = normalizeCurrentJob(jobValue);
  const id = (job.sourceUrl || `${job.title}\n${job.company}`).toLocaleLowerCase().slice(0, 2000);
  const timestamp = validTimestamp(now);
  const resumeFileName = clean(fileName, 200);
  if (!timestamp || !resumeFileName) return applications;
  return applications.map((application) => application.id === id
    ? { ...application, resumeFileName, updatedAt: timestamp }
    : application
  );
}

export function updateApplicationStatus(applications: TrackedApplication[], id: string, status: string, now: string): TrackedApplication[] {
  const timestamp = validTimestamp(now);
  if (!applicationStatuses.includes(status as ApplicationStatus) || !timestamp) return applications;
  return applications.map((application) => application.id === id
    ? { ...application, status: status as ApplicationStatus, updatedAt: timestamp }
    : application
  );
}
