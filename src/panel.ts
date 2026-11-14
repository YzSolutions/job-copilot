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
  buildLocalTailoringPlanPrompt,
  cloudRequestContainsKnownPrivateValue,
  matchSchema,
  normalizeCloudTailoringRequest,
  parseLocalTailoringPlan,
  parseMatchResult,
  parseResumePatch,
  patchSchema,
  pickBestMatch,
  tailoringPlanSchema,
  type CloudTailoringRequest,
  type LocalTailoringPlan,
  type ResumePatch
} from "./prompts.js";
import {
  firebaseConfig,
  hasFirebaseConfig,
  recaptchaEnterpriseSiteKey
} from "./firebase-config.js";
import { createTailoredDocx, mergeResumes, parseDocxBytes, tailoredResumeFileName } from "./docx.js";
import { loadResumeFile, saveResumeFile } from "./resume-store.js";
import { cloudChoiceMessage, needsCloudChoice } from "./nano.js";
import type { Resume } from "./prompts.js";
import {
  completedVaultFields,
  emptyCandidateVault,
  missingCandidateVaultFields,
  normalizeCandidateVault,
  type CandidateVault
} from "./vault.js";
import {
  currentJobPrompt,
  emptyCurrentJob,
  normalizeCurrentJob,
  type CurrentJob
} from "./job.js";
import {
  buildAutofillPlan,
  normalizeApplicationFields,
  type AutofillEntry
} from "./autofill.js";
import {
  applicationStatuses,
  attachApplicationResume,
  normalizeTrackedApplications,
  recordApplication,
  updateApplicationStatus,
  type TrackedApplication
} from "./tracker.js";

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
const cloudFallbackButton = document.querySelector<HTMLButtonElement>("#cloud-fallback")!;
const resumeFiles = document.querySelector<HTMLInputElement>("#resume-files")!;
const resumeStatus = document.querySelector<HTMLElement>("#resume-status")!;
const localDescription = document.querySelector<HTMLElement>("#local-description")!;
const vaultForm = document.querySelector<HTMLFormElement>("#candidate-vault")!;
const vaultStatus = document.querySelector<HTMLElement>("#vault-status")!;
const readJobButton = document.querySelector<HTMLButtonElement>("#read-job")!;
const currentJobForm = document.querySelector<HTMLFormElement>("#current-job")!;
const jobStatus = document.querySelector<HTMLElement>("#job-status")!;
const cloudForm = document.querySelector<HTMLFormElement>("#cloud-tailoring")!;
const cloudDemoButton = document.querySelector<HTMLButtonElement>("#load-cloud-demo")!;
const cloudStatus = document.querySelector<HTMLElement>("#cloud-status")!;
const tailoringJobRequirements = document.querySelector<HTMLTextAreaElement>("#tailor-job-requirements")!;
const tailoringResumeSection = document.querySelector<HTMLTextAreaElement>("#tailor-resume-section")!;
const tailoringEvidence = document.querySelector<HTMLTextAreaElement>("#tailor-evidence")!;
const candidateInsights = document.querySelector<HTMLElement>("#candidate-insights")!;
const candidateProfile = document.querySelector<HTMLElement>("#candidate-profile")!;
const scanAutofillButton = document.querySelector<HTMLButtonElement>("#scan-autofill")!;
const autofillStatus = document.querySelector<HTMLElement>("#autofill-status")!;
const autofillDialog = document.querySelector<HTMLDialogElement>("#autofill-consent")!;
const autofillPreview = document.querySelector<HTMLElement>("#autofill-preview")!;
const recordApplicationButton = document.querySelector<HTMLButtonElement>("#record-application")!;
const applicationStatus = document.querySelector<HTMLElement>("#application-status")!;
const applicationList = document.querySelector<HTMLUListElement>("#application-list")!;
const downloadResumeButton = document.querySelector<HTMLButtonElement>("#download-resume")!;
const exportStatus = document.querySelector<HTMLElement>("#export-status")!;

let ai: ReturnType<typeof getAI> | undefined;
let localResumes: Resume[] = [];
let currentJob: CurrentJob = emptyCurrentJob;
let candidateVault: CandidateVault = emptyCandidateVault;
let pendingCloudRequest: CloudTailoringRequest | undefined;
let pendingCloudResumeId: string | undefined;
let pendingAutofillEntries: AutofillEntry[] = [];
let trackedApplications: TrackedApplication[] = [];
let localTailoringPlan: (LocalTailoringPlan & { resumeId: string; jobSourceUrl: string }) | undefined;
let approvedResumePatch: (ResumePatch & { resumeId: string; jobSourceUrl: string; exportedFileName?: string }) | undefined;
const resumeStorageKey = "localResumes";
const vaultStorageKey = "candidateVault";
const jobStorageKey = "currentJob";
const tailoringPlanStorageKey = "localTailoringPlan";
const applicationsStorageKey = "trackedApplications";
const approvedPatchStorageKey = "approvedResumePatch";

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
  routeMessage.hidden = !needsCloudChoice(availability);
  cloudFallbackButton.hidden = routeMessage.hidden;
  routeMessage.textContent = routeMessage.hidden
    ? ""
    : cloudChoiceMessage;
}

cloudFallbackButton.addEventListener("click", () => {
  document.querySelector(".card.cloud")?.scrollIntoView({ behavior: "smooth", block: "start" });
  tailoringJobRequirements.focus();
});

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
  if (!tailoringJobRequirements.value && currentJob.description) {
    tailoringJobRequirements.value = currentJobPrompt(currentJob).slice(0, 6000);
  }
  showResumeStatus();
  recordApplicationButton.disabled = !currentJob.title;
}

function showTrackedApplications() {
  applicationList.replaceChildren();
  applicationStatus.textContent = trackedApplications.length
    ? `${trackedApplications.length} application${trackedApplications.length === 1 ? "" : "s"} stored locally.`
    : "No applications recorded yet.";
  for (const application of trackedApplications) {
    const item = document.createElement("li");
    item.className = "application-item";
    const heading = document.createElement("strong");
    heading.textContent = application.title;
    const details = document.createElement("small");
    details.textContent = [
      `${application.company || "Company not recorded"} · ${new Date(application.createdAt).toLocaleDateString()}`,
      application.resumeFileName ? `Résumé: ${application.resumeFileName}` : ""
    ].filter(Boolean).join("\n");
    const actions = document.createElement("div");
    actions.className = "application-actions";
    const status = document.createElement("select");
    status.setAttribute("aria-label", `Status for ${application.title}`);
    for (const value of applicationStatuses) status.add(new Option(value, value, false, value === application.status));
    status.addEventListener("change", async () => {
      trackedApplications = updateApplicationStatus(trackedApplications, application.id, status.value, new Date().toISOString());
      await chrome.storage.local.set({ [applicationsStorageKey]: trackedApplications });
      showTrackedApplications();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${application.title}`);
    remove.addEventListener("click", async () => {
      trackedApplications = trackedApplications.filter((item) => item.id !== application.id);
      await chrome.storage.local.set({ [applicationsStorageKey]: trackedApplications });
      showTrackedApplications();
    });
    actions.append(status, remove);
    item.append(heading, details, actions);
    applicationList.append(item);
  }
}

function showLocalTailoringPlan() {
  const appliesToCurrentJob = localTailoringPlan && localTailoringPlan.jobSourceUrl === currentJob.sourceUrl;
  candidateInsights.hidden = !appliesToCurrentJob;
  if (!appliesToCurrentJob || !localTailoringPlan) return;
  candidateProfile.textContent = `${localTailoringPlan.professionalProfile}\n\nSkills: ${localTailoringPlan.skills.join(", ")}\n\nWhy this section: ${localTailoringPlan.reason}`;
  tailoringJobRequirements.value = localTailoringPlan.jobRequirement;
  tailoringResumeSection.value = localTailoringPlan.sectionText;
  tailoringEvidence.value = localTailoringPlan.verifiedEvidence;
}

async function refreshExportAvailability() {
  const appliesToCurrentJob = approvedResumePatch && approvedResumePatch.jobSourceUrl === currentJob.sourceUrl;
  if (!appliesToCurrentJob || !approvedResumePatch) {
    downloadResumeButton.disabled = true;
    exportStatus.textContent = "Complete an approved rewrite to prepare a tailored file.";
    return;
  }
  const source = await loadResumeFile(approvedResumePatch.resumeId).catch(() => undefined);
  downloadResumeButton.disabled = !source;
  exportStatus.textContent = source
    ? approvedResumePatch.exportedFileName
      ? `Ready. Last downloaded as ${approvedResumePatch.exportedFileName}.`
      : "Approved rewrite and original DOCX are ready locally."
    : "Re-import the selected DOCX once so its original formatting can be used. No file was sent anywhere.";
}

async function clearApprovedResumePatch() {
  approvedResumePatch = undefined;
  await chrome.storage.local.remove(approvedPatchStorageKey);
  await refreshExportAvailability();
}

async function clearLocalTailoringPlan() {
  localTailoringPlan = undefined;
  candidateInsights.hidden = true;
  await chrome.storage.local.remove(tailoringPlanStorageKey);
  await clearApprovedResumePatch();
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

async function loadLocalTailoringPlan() {
  const stored = (await chrome.storage.local.get(tailoringPlanStorageKey))[tailoringPlanStorageKey];
  const source = stored && typeof stored === "object" ? stored as Record<string, unknown> : {};
  localTailoringPlan =
    typeof source.professionalProfile === "string" &&
    Array.isArray(source.skills) && source.skills.every((skill) => typeof skill === "string") &&
    typeof source.jobRequirement === "string" &&
    typeof source.sectionText === "string" &&
    typeof source.verifiedEvidence === "string" &&
    typeof source.reason === "string" &&
    typeof source.resumeId === "string" &&
    typeof source.jobSourceUrl === "string"
      ? source as LocalTailoringPlan & { resumeId: string; jobSourceUrl: string }
      : undefined;
  showLocalTailoringPlan();
}

async function loadApprovedResumePatch() {
  const stored = (await chrome.storage.local.get(approvedPatchStorageKey))[approvedPatchStorageKey];
  const source = stored && typeof stored === "object" ? stored as Record<string, unknown> : {};
  approvedResumePatch =
    source.sectionId === "selected-section" &&
    typeof source.originalText === "string" &&
    typeof source.proposedText === "string" &&
    typeof source.reason === "string" &&
    typeof source.resumeId === "string" &&
    typeof source.jobSourceUrl === "string" &&
    (source.exportedFileName === undefined || typeof source.exportedFileName === "string")
      ? source as ResumePatch & { resumeId: string; jobSourceUrl: string; exportedFileName?: string }
      : undefined;
  await refreshExportAvailability();
}

async function loadCandidateVault() {
  const stored = (await chrome.storage.local.get(vaultStorageKey))[vaultStorageKey];
  candidateVault = normalizeCandidateVault(stored);
  for (const [name, value] of Object.entries(candidateVault)) {
    const field = vaultForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
  }
  const completed = completedVaultFields(candidateVault);
  const missing = missingCandidateVaultFields(candidateVault);
  vaultStatus.textContent = completed
    ? `${completed} of ${Object.keys(emptyCandidateVault).length} reusable fields saved locally.${missing.length ? ` Still needed: ${missing.join(", ")}.` : " Profile complete."}`
    : "No candidate details saved yet.";
}

async function loadTrackedApplications() {
  trackedApplications = normalizeTrackedApplications((await chrome.storage.local.get(applicationsStorageKey))[applicationsStorageKey]);
  showTrackedApplications();
}

vaultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  candidateVault = normalizeCandidateVault(Object.fromEntries(new FormData(vaultForm)));
  await chrome.storage.local.set({ [vaultStorageKey]: candidateVault });
  const missing = missingCandidateVaultFields(candidateVault);
  vaultStatus.textContent = `${completedVaultFields(candidateVault)} of ${Object.keys(emptyCandidateVault).length} reusable fields saved locally.${missing.length ? ` Still needed: ${missing.join(", ")}.` : " Profile complete."}`;
});

scanAutofillButton.addEventListener("click", async () => {
  scanAutofillButton.disabled = true;
  autofillStatus.textContent = "Scanning visible application fields…";
  try {
    candidateVault = normalizeCandidateVault((await chrome.storage.local.get(vaultStorageKey))[vaultStorageKey]);
    const response = await chrome.runtime.sendMessage({ type: "SCAN_APPLICATION_FORM" }) as { ok?: boolean; fields?: unknown; error?: string };
    if (!response.ok) throw new Error(response.error || "The application form could not be scanned.");
    pendingAutofillEntries = buildAutofillPlan(normalizeApplicationFields(response.fields), candidateVault);
    if (!pendingAutofillEntries.length) throw new Error("No empty, supported application fields matched your saved local details.");
    autofillPreview.textContent = pendingAutofillEntries.map((entry) => `${entry.label.replace(/:\s*$/, "")}: ${entry.value}`).join("\n\n");
    autofillStatus.textContent = `${pendingAutofillEntries.length} field${pendingAutofillEntries.length === 1 ? "" : "s"} ready for review. Nothing has been filled yet.`;
    autofillDialog.showModal();
  } catch (error) {
    pendingAutofillEntries = [];
    autofillStatus.textContent = error instanceof Error ? error.message : "The application form could not be scanned.";
  } finally {
    scanAutofillButton.disabled = false;
  }
});

autofillDialog.addEventListener("close", async () => {
  if (autofillDialog.returnValue !== "approve" || !pendingAutofillEntries.length) {
    pendingAutofillEntries = [];
    autofillStatus.textContent = "Autofill cancelled. The page was not changed.";
    return;
  }
  const entries = pendingAutofillEntries;
  pendingAutofillEntries = [];
  autofillStatus.textContent = "Filling the reviewed fields locally…";
  const response = await chrome.runtime.sendMessage({ type: "APPLY_APPLICATION_FORM", entries }) as { ok?: boolean; filled?: number; skipped?: number; error?: string };
  autofillStatus.textContent = response.ok
    ? `Filled ${response.filled ?? 0} reviewed field${response.filled === 1 ? "" : "s"}. ${response.skipped ?? 0} changed or unsupported field${response.skipped === 1 ? " was" : "s were"} skipped. The application was not submitted.`
    : response.error || "The reviewed fields could not be filled.";
});

recordApplicationButton.addEventListener("click", async () => {
  try {
    trackedApplications = recordApplication(trackedApplications, currentJob, new Date().toISOString());
    if (approvedResumePatch?.jobSourceUrl === currentJob.sourceUrl && approvedResumePatch.exportedFileName) {
      trackedApplications = attachApplicationResume(trackedApplications, currentJob, approvedResumePatch.exportedFileName, new Date().toISOString());
    }
    await chrome.storage.local.set({ [applicationsStorageKey]: trackedApplications });
    showTrackedApplications();
    applicationStatus.textContent = `${currentJob.title} was recorded locally as applied.`;
  } catch (error) {
    applicationStatus.textContent = error instanceof Error ? error.message : "The application could not be recorded.";
  }
});

readJobButton.addEventListener("click", async () => {
  readJobButton.disabled = true;
  jobStatus.textContent = "Reading visible job details from the active tab…";
  try {
    const response = await chrome.runtime.sendMessage({ type: "READ_CURRENT_JOB" }) as { ok?: boolean; job?: unknown; error?: string };
    if (!response.ok) throw new Error(response.error || "The job page could not be read.");
    currentJob = normalizeCurrentJob(response.job);
    if (!currentJob.description) throw new Error("No readable job description was found on this page.");
    await clearLocalTailoringPlan();
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
  await clearLocalTailoringPlan();
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
    const parsedFiles = await Promise.all(files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const resume = parseDocxBytes(bytes, file.name);
      return { resume, fileName: file.name, bytes };
    }));
    const imported = parsedFiles.map(({ resume }) => resume);
    const merged = mergeResumes(localResumes, imported);
    const selectedChanged = localTailoringPlan && imported.some((resume) =>
      resume.id === localTailoringPlan?.resumeId &&
      localResumes.find((stored) => stored.id === resume.id)?.professionalText !== resume.professionalText
    );
    await Promise.all(parsedFiles.map(({ resume, fileName, bytes }) => saveResumeFile(resume.id, fileName, bytes)));
    localResumes = merged;
    if (selectedChanged) await clearLocalTailoringPlan();
    await chrome.storage.local.set({ [resumeStorageKey]: localResumes });
    showResumeStatus();
    await refreshExportAvailability();
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
    const jobDescription = currentJob.description ? currentJobPrompt(currentJob) : fictionalJob;
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
      const response = await model.generateContent(buildLocalPrompt(jobDescription, [resume]));
      if (response.response.inferenceSource !== InferenceSource.ON_DEVICE) {
        throw new Error("A résumé score did not run on-device.");
      }
      scores.push(parseMatchResult(response.response.text(), [resume.id]));
    }
    const parsed = pickBestMatch(scores);
    const bestResume = resumes.find((resume) => resume.id === parsed.recommendedResumeId)!;
    result.textContent = `Preparing the matching résumé section locally: ${bestResume.label}`;
    const tailoringModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        },
        promptOptions: { responseConstraint: tailoringPlanSchema }
      }
    });
    await tailoringModel.initializeDeviceModel();
    const tailoringResponse = await tailoringModel.generateContent(buildLocalTailoringPlanPrompt(jobDescription, bestResume));
    if (tailoringResponse.response.inferenceSource !== InferenceSource.ON_DEVICE) {
      throw new Error("The tailoring plan did not run on-device.");
    }
    localTailoringPlan = {
      ...parseLocalTailoringPlan(tailoringResponse.response.text(), jobDescription, bestResume),
      resumeId: bestResume.id,
      jobSourceUrl: currentJob.sourceUrl
    };
    await clearApprovedResumePatch();
    await chrome.storage.local.set({ [tailoringPlanStorageKey]: localTailoringPlan });
    showLocalTailoringPlan();
    setState(
      "ON_DEVICE",
      `${parsed.score}/100 · ${parsed.reason}\n\nRecommended: ${bestResume.label}\nMissing: ${parsed.missingRequirements.join(", ") || "None"}\n\nThe matching section and evidence were prepared locally for your review.`
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

cloudDemoButton.addEventListener("click", () => {
  for (const [name, value] of Object.entries(cloudFixture)) {
    const field = cloudForm.elements.namedItem(name);
    if (field instanceof HTMLTextAreaElement) field.value = value;
  }
  cloudStatus.textContent = "Fictional professional content loaded. Review it before continuing.";
});

cloudForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    candidateVault = normalizeCandidateVault((await chrome.storage.local.get(vaultStorageKey))[vaultStorageKey]);
    pendingCloudRequest = normalizeCloudTailoringRequest(Object.fromEntries(new FormData(cloudForm)));
    const knownPrivateValues = Object.values(candidateVault);
    if (cloudRequestContainsKnownPrivateValue(pendingCloudRequest, knownPrivateValues)) {
      throw new Error("Remove candidate identity, contact, authorization, and clearance details before cloud review.");
    }
    const plannedResume = localResumes.find((resume) =>
      resume.id === localTailoringPlan?.resumeId && resume.professionalText.includes(pendingCloudRequest!.sectionText)
    );
    const matchingResumes = localResumes.filter((resume) => resume.professionalText.includes(pendingCloudRequest!.sectionText));
    pendingCloudResumeId = plannedResume?.id ?? (matchingResumes.length === 1 ? matchingResumes[0].id : undefined);
  } catch (error) {
    pendingCloudResumeId = undefined;
    cloudStatus.textContent = error instanceof Error ? error.message : "The cloud request is incomplete.";
    return;
  }
  consentPreview.textContent = [
    `Job requirements: ${pendingCloudRequest.jobRequirements}`,
    `Resume section: ${pendingCloudRequest.sectionText}`,
    `Verified evidence: ${pendingCloudRequest.verifiedEvidence}`
  ].join("\n\n");
  consentDialog.showModal();
});

consentDialog.addEventListener("close", async () => {
  if (consentDialog.returnValue !== "approve" || !ai || !pendingCloudRequest) {
    pendingCloudRequest = undefined;
    pendingCloudResumeId = undefined;
    cloudStatus.textContent = "Kept local. No professional content was sent.";
    return;
  }
  const request = pendingCloudRequest;
  const resumeId = pendingCloudResumeId;
  pendingCloudRequest = undefined;
  pendingCloudResumeId = undefined;
  cloudButton.disabled = true;
  cloudStatus.textContent = "Sending only the approved professional content…";
  setState("IN_CLOUD", "Sending only the displayed résumé section and verified evidence…");
  await clearApprovedResumePatch();
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
    const response = await model.generateContent(buildCloudPrompt(request));
    const parsed = parseResumePatch(response.response.text(), request.sectionId, request.sectionText);
    if (response.response.inferenceSource !== InferenceSource.IN_CLOUD) {
      throw new Error("The approved request did not use the cloud model.");
    }
    if (resumeId) {
      approvedResumePatch = { ...parsed, resumeId, jobSourceUrl: currentJob.sourceUrl };
      await chrome.storage.local.set({ [approvedPatchStorageKey]: approvedResumePatch });
      await refreshExportAvailability();
    } else {
      await clearApprovedResumePatch();
    }
    setState(
      "IN_CLOUD",
      `${parsed.originalText}\n\n→ ${parsed.proposedText}\n\nWhy: ${parsed.reason}`
    );
    cloudStatus.textContent = resumeId
      ? "Cloud rewrite complete. The original local résumé was not changed; a local DOCX copy is ready below."
      : "Cloud rewrite complete. This demo section was not linked to a stored résumé, so no DOCX was created.";
  } catch (error) {
    setState("ERROR", error instanceof Error ? error.message : "Cloud AI failed.");
    cloudStatus.textContent = "Cloud rewrite failed. The original local résumé was not changed.";
  } finally {
    cloudButton.disabled = false;
  }
});

downloadResumeButton.addEventListener("click", async () => {
  if (!approvedResumePatch || approvedResumePatch.jobSourceUrl !== currentJob.sourceUrl) return;
  downloadResumeButton.disabled = true;
  exportStatus.textContent = "Creating a local DOCX copy…";
  try {
    const source = await loadResumeFile(approvedResumePatch.resumeId);
    if (!source) throw new Error("Re-import the selected DOCX before downloading a tailored copy.");
    const resume = localResumes.find((item) => item.id === approvedResumePatch!.resumeId);
    if (!resume) throw new Error("The selected local résumé is no longer available.");
    const bytes = createTailoredDocx(source.bytes, source.fileName, approvedResumePatch.originalText, approvedResumePatch.proposedText);
    const fileName = tailoredResumeFileName(resume.label, currentJob.company, currentJob.title);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    approvedResumePatch = { ...approvedResumePatch, exportedFileName: fileName };
    await chrome.storage.local.set({ [approvedPatchStorageKey]: approvedResumePatch });
    trackedApplications = attachApplicationResume(trackedApplications, currentJob, fileName, new Date().toISOString());
    await chrome.storage.local.set({ [applicationsStorageKey]: trackedApplications });
    showTrackedApplications();
    exportStatus.textContent = `Downloaded ${fileName}. The original DOCX was not changed.`;
  } catch (error) {
    exportStatus.textContent = error instanceof Error ? error.message : "The tailored DOCX could not be created.";
  } finally {
    await refreshExportAvailability();
  }
});

async function initializePanel() {
  initializeFirebase();
  await Promise.all([loadCurrentJob(), loadLocalResumes(), loadCandidateVault(), loadTrackedApplications()]);
  await loadLocalTailoringPlan();
  await loadApprovedResumePatch();
  await refreshNanoStatus();
}

void initializePanel();

