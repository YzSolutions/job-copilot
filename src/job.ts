export type JobPageSnapshot = {
  url: string;
  pageTitle: string;
  metaTitle: string;
  h1: string;
  companyText: string;
  jsonLd: string[];
  visibleText: string;
};

export type CurrentJob = {
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
};

export const emptyCurrentJob: CurrentJob = {
  title: "",
  company: "",
  description: "",
  sourceUrl: ""
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function stripMarkup(value: unknown): string {
  return cleanText(value, 30000)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findJobPosting(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.includes("JobPosting")) return record;
  return findJobPosting(record["@graph"]);
}

function organizationName(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? cleanText((value as Record<string, unknown>).name, 300) : "";
}

function companyFromPageTitle(value: unknown): string {
  const title = cleanText(value, 500);
  return cleanText(title.match(/\sat\s+(.+?)(?:\s+[|–—-]\s+.*)?$/i)?.[1], 300);
}

export function normalizeCurrentJob(value: unknown): CurrentJob {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sourceUrl = cleanText(source.sourceUrl, 2000);
  return {
    title: cleanText(source.title, 300),
    company: cleanText(source.company, 300),
    description: cleanText(source.description, 20000),
    sourceUrl: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : ""
  };
}

export function extractCurrentJob(snapshot: unknown): CurrentJob {
  const source = snapshot && typeof snapshot === "object" ? snapshot as Record<string, unknown> : {};
  const jsonLd = Array.isArray(source.jsonLd) ? source.jsonLd : [];
  let posting: Record<string, unknown> | undefined;
  for (const raw of jsonLd) {
    if (typeof raw !== "string") continue;
    try {
      posting = findJobPosting(JSON.parse(raw));
      if (posting) break;
    } catch {
      // Invalid page metadata is ignored in favor of visible text.
    }
  }

  return normalizeCurrentJob({
    title: cleanText(posting?.title, 300) || cleanText(source.h1, 300) || cleanText(source.metaTitle, 300) || cleanText(source.pageTitle, 300),
    company: organizationName(posting?.hiringOrganization) || cleanText(source.companyText, 300) || companyFromPageTitle(source.pageTitle),
    description: stripMarkup(posting?.description) || cleanText(source.visibleText, 20000),
    sourceUrl: source.url
  });
}

export function currentJobPrompt(job: CurrentJob): string {
  return [
    job.title && `TITLE: ${job.title}`,
    job.company && `COMPANY: ${job.company}`,
    `DESCRIPTION:\n${job.description}`
  ].filter(Boolean).join("\n\n");
}
