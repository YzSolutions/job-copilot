import { initializeApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource
} from "firebase/ai";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "firebase/app-check";
import { cloudFixture, fictionalJob, fictionalResumes } from "./fixtures.js";
import {
  buildCloudPrompt,
  buildLocalPrompt,
  matchSchema,
  parseMatchResult,
  parseResumePatch,
  patchSchema,
  pickBestMatch
} from "./prompts.js";
import {
  firebaseConfig,
  hasFirebaseConfig,
  recaptchaEnterpriseSiteKey
} from "./firebase-config.js";
import { mergeResumes, parseDocxFile } from "./docx.js";
import type { Resume } from "./prompts.js";
import {
  completedVaultFields,
  emptyCandidateVault,
  normalizeCandidateVault
} from "./vault.js";
import {
  currentJobPrompt,
  emptyCurrentJob,
  normalizeCurrentJob,
  type CurrentJob
} from "./job.js";

declare const __APP_CHECK_DEBUG__: boolean | string;
declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
    LanguageModel?: {
      availability: (options?: {
        expectedInputs?: Array<{ type: "text"; languages: string[] }>;
        expectedOutputs?: Array<{ type: "text"; languages: string[] }>;
      }) => Promise<string>;
    };
  }
}

const localButton = document.querySelector<HTMLButtonElement>("#run-local")!;
const cloudButton = document.querySelector<HTMLButtonElement>("#run-cloud")!;
const consentDialog = document.querySelector<HTMLDialogElement>("#cloud-consent")!;
const consentPreview = document.querySelector<HTMLElement>("#consent-preview")!;
const result = document.querySelector<HTMLElement>("#result")!;
const badge = document.querySelector<HTMLElement>("#source-badge")!;
const setupMessage = document.querySelector<HTMLElement>("#setup-message")!;
const nanoStatus = document.querySelector<HTMLElement>("#nano-status")!;
const routeMessage = document.querySelector<HTMLElement>("#route-message")!;
const resumeFiles = document.querySelector<HTMLInputElement>("#resume-files")!;
const resumeStatus = document.querySelector<HTMLElement>("#resume-status")!;
const localDescription = document.querySelector<HTMLElement>("#local-description")!;
const vaultForm = document.querySelector<HTMLFormElement>("#candidate-vault")!;
const vaultStatus = document.querySelector<HTMLElement>("#vault-status")!;
const readJobButton = document.querySelector<HTMLButtonElement>("#read-job")!;
const currentJobForm = document.querySelector<HTMLFormElement>("#current-job")!;
const jobStatus = document.querySelector<HTMLElement>("#job-status")!;

let ai: ReturnType<typeof getAI> | undefined;
let localResumes: Resume[] = [];
let currentJob: CurrentJob = emptyCurrentJob;
const resumeStorageKey = "localResumes";
const vaultStorageKey = "candidateVault";
const jobStorageKey = "currentJob";

function setState(source: "ON_DEVICE" | "IN_CLOUD" | "UNAVAILABLE" | "ERROR", message: string) {
  badge.textContent = source.replace("_", " ");
  badge.dataset.source = source;
  result.textContent = message;
}

function initializeFirebase() {
  if (!hasFirebaseConfig) {
    setupMessage.hidden = false;
    localButton.disabled = true;
    cloudButton.disabled = true;
    return;
  }

  const app = initializeApp(firebaseConfig);
  if (__APP_CHECK_DEBUG__) window.FIREBASE_APPCHECK_DEBUG_TOKEN = __APP_CHECK_DEBUG__;
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
    isTokenAutoRefreshEnabled: true
  });
  ai = getAI(app, { backend: new GoogleAIBackend() });
}

async function refreshNanoStatus() {
  let availability = "unavailable";
  try {
    availability = window.LanguageModel
      ? await window.LanguageModel.availability({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        })
      : "unsupported";
  } catch {
    availability = "unavailable";
  }
  nanoStatus.textContent = availability;
  routeMessage.hidden = !["unsupported", "unavailable"].includes(availability);
  routeMessage.textContent = routeMessage.hidden
    ? ""
    : "On-device AI is unavailable. Nothing was sent. You may separately review and approve the fictional cloud test below.";
}

function showResumeStatus() {
  resumeStatus.textContent = localResumes.length
    ? `${localResumes.length} local résumé${localResumes.length === 1 ? "" : "s"} loaded: ${localResumes.map((resume) => resume.label).join(", ")}`
    : "Fictional demo résumés are active.";
  const jobName = currentJob.description ? `${currentJob.title || "the reviewed job"}${currentJob.company ? ` at ${currentJob.company}` : ""}` : "the fictional transformation role";
  localDescription.textContent = localResumes.length
    ? `${localResumes.length} locally stored résumés will be compared to ${jobName}. No cloud fallback is allowed.`
    : `Two fictional résumés are compared to ${jobName}. No cloud fallback is allowed.`;
}

function showCurrentJob() {
  for (const [name, value] of Object.entries(currentJob)) {
    const field = currentJobForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = value;
  }
  currentJobForm.hidden = !currentJob.description;
  jobStatus.textContent = currentJob.description
    ? `Saved locally: ${currentJob.title || "Untitled job"}${currentJob.company ? ` · ${currentJob.company}` : ""}`
    : "No job page saved yet.";
  showResumeStatus();
}

async function loadCurrentJob() {
  currentJob = normalizeCurrentJob((await chrome.storage.local.get(jobStorageKey))[jobStorageKey]);
  showCurrentJob();
}

async function loadLocalResumes() {
  const stored = (await chrome.storage.local.get(resumeStorageKey))[resumeStorageKey];
  localResumes = Array.isArray(stored)
    ? stored.filter((resume): resume is Resume =>
        typeof resume?.id === "string" && typeof resume?.label === "string" && typeof resume?.professionalText === "string"
      ).slice(0, 5)
    : [];
  showResumeStatus();
}

async function loadCandidateVault() {
  const stored = (await chrome.storage.local.get(vaultStorageKey))[vaultStorageKey];
  const vault = normalizeCandidateVault(stored);
  for (const [name, value] of Object.entries(vault)) {
    const field = vaultForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
  }
  const completed = completedVaultFields(vault);
  vaultStatus.textContent = completed
    ? `${completed} of ${Object.keys(emptyCandidateVault).length} reusable fields saved locally.`
    : "No candidate details saved yet.";
}

vaultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const vault = normalizeCandidateVault(Object.fromEntries(new FormData(vaultForm)));
  await chrome.storage.local.set({ [vaultStorageKey]: vault });
  vaultStatus.textContent = `${completedVaultFields(vault)} of ${Object.keys(emptyCandidateVault).length} reusable fields saved locally.`;
});

readJobButton.addEventListener("click", async () => {
  readJobButton.disabled = true;
  jobStatus.textContent = "Reading visible job details from the active tab…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "READ_CURRENT_JOB" }) as { ok?: boolean; job?: unknown; error?: string };
    if (!response.ok) throw new Error(response.error || "The job page could not be read.");
    currentJob = normalizeCurrentJob(response.job);
    if (!currentJob.description) throw new Error("No readable job description was found on this page.");
    await chrome.storage.local.set({ [jobStorageKey]: currentJob });
    showCurrentJob();
  } catch (error) {
    jobStatus.textContent = error instanceof Error ? error.message : "The job page could not be read.";
  } finally {
    readJobButton.disabled = false;
  }
});

currentJobForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  currentJob = normalizeCurrentJob(Object.fromEntries(new FormData(currentJobForm)));
  if (!currentJob.description) {
    jobStatus.textContent = "Add a job description before saving.";
    return;
  }
  await chrome.storage.local.set({ [jobStorageKey]: currentJob });
  showCurrentJob();
});

resumeFiles.addEventListener("change", async () => {
  const files = Array.from(resumeFiles.files ?? []);
  if (!files.length) return;
  if (files.length > 5) {
    resumeStatus.textContent = "Choose no more than five DOCX résumés.";
    return;
  }
  try {
    localResumes = mergeResumes(localResumes, await Promise.all(files.map(parseDocxFile)));
    await chrome.storage.local.set({ [resumeStorageKey]: localResumes });
    showResumeStatus();
  } catch (error) {
    resumeStatus.textContent = error instanceof Error ? error.message : "The résumés could not be loaded.";
  } finally {
    resumeFiles.value = "";
  }
});

localButton.addEventListener("click", async () => {
  if (!ai) return;
  localButton.disabled = true;
  setState("ON_DEVICE", "Preparing the on-device model…");
  try {
    const resumes = localResumes.length ? localResumes : fictionalResumes;
    const model = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        },
        promptOptions: { responseConstraint: matchSchema }
      }
    });
    await model.initializeDeviceModel((progress) => {
      result.textContent = `Downloading local model: ${Math.round(progress * 100)}%`;
    });
    const scores = [];
    for (const [index, resume] of resumes.entries()) {
      result.textContent = `Scoring local résumé ${index + 1} of ${resumes.length}: ${resume.label}`;
      const jobDescription = currentJob.description ? currentJobPrompt(currentJob) : fictionalJob;
      const response = await model.generateContent(buildLocalPrompt(jobDescription, [resume]));
      if (response.response.inferenceSource !== InferenceSource.ON_DEVICE) {
        throw new Error("A résumé score did not run on-device.");
      }
      scores.push(parseMatchResult(response.response.text(), [resume.id]));
    }
    const parsed = pickBestMatch(scores);
    setState(
      "ON_DEVICE",
      `${parsed.score}/100 · ${parsed.reason}\n\nRecommended: ${parsed.recommendedResumeId}\nMissing: ${parsed.missingRequirements.join(", ") || "None"}`
    );
  } catch (error) {
    setState(
      "UNAVAILABLE",
      `${error instanceof Error ? error.message : "Local AI is unavailable."}\n\nNothing was sent to the cloud. You may choose the cloud test separately.`
    );
  } finally {
    localButton.disabled = false;
    await refreshNanoStatus();
  }
});

cloudButton.addEventListener("click", () => {
  consentPreview.textContent = [
    `Job requirements: ${cloudFixture.jobRequirements}`,
    `Resume section: ${cloudFixture.sectionText}`,
    `Verified evidence: ${cloudFixture.verifiedEvidence}`
  ].join("\n\n");
  consentDialog.showModal();
});

consentDialog.addEventListener("close", async () => {
  if (consentDialog.returnValue !== "approve" || !ai) return;
  cloudButton.disabled = true;
  setState("IN_CLOUD", "Sending only the displayed fictional section…");
  try {
    const model = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: "gemini-3.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: patchSchema
        }
      }
    });
    const response = await model.generateContent(buildCloudPrompt(cloudFixture));
    const parsed = parseResumePatch(response.response.text(), cloudFixture.sectionId);
    setState(
      response.response.inferenceSource === InferenceSource.IN_CLOUD ? "IN_CLOUD" : "ERROR",
      `${parsed.originalText}\n\n→ ${parsed.proposedText}\n\nWhy: ${parsed.reason}`
    );
  } catch (error) {
    setState("ERROR", error instanceof Error ? error.message : "Cloud AI failed.");
  } finally {
    cloudButton.disabled = false;
  }
});

initializeFirebase();
loadCurrentJob();
loadLocalResumes();
loadCandidateVault();
refreshNanoStatus();

