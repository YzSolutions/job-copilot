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
  patchSchema
} from "./prompts.js";
import {
  firebaseConfig,
  hasFirebaseConfig,
  recaptchaEnterpriseSiteKey
} from "./firebase-config.js";
import { parseDocxFile } from "./docx.js";
import type { Resume } from "./prompts.js";

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

let ai: ReturnType<typeof getAI> | undefined;
let localResumes: Resume[] = [];
const resumeStorageKey = "localResumes";

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
  localDescription.textContent = localResumes.length
    ? `${localResumes.length} locally stored résumés will be compared to the fictional transformation role. No cloud fallback is allowed.`
    : "Two fictional résumés are compared to a fictional transformation role. No cloud fallback is allowed.";
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

resumeFiles.addEventListener("change", async () => {
  const files = Array.from(resumeFiles.files ?? []);
  if (!files.length) return;
  if (files.length > 5) {
    resumeStatus.textContent = "Choose no more than five DOCX résumés.";
    return;
  }
  try {
    localResumes = await Promise.all(files.map(parseDocxFile));
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
    const response = await model.generateContent(buildLocalPrompt(fictionalJob, resumes));
    const parsed = parseMatchResult(
      response.response.text(),
      resumes.map((resume) => resume.id)
    );
    setState(
      response.response.inferenceSource === InferenceSource.ON_DEVICE ? "ON_DEVICE" : "ERROR",
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
loadLocalResumes();
refreshNanoStatus();

