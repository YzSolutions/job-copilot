import { extractCurrentJob, type JobPageSnapshot } from "./job.js";

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId !== undefined) chrome.sidePanel.open({ windowId: tab.windowId });
});

function collectPageSnapshot(): JobPageSnapshot {
  const text = (selector: string) => document.querySelector<HTMLElement>(selector)?.innerText ?? "";
  const visibleRoot = document.querySelector<HTMLElement>("main, article, [role='main']") ?? document.body;
  return {
    url: location.href,
    pageTitle: document.title,
    metaTitle: document.querySelector<HTMLMetaElement>("meta[property='og:title']")?.content ?? "",
    h1: text("h1"),
    companyText: text("[data-company-name], .company-name, [class*='companyName'], [class*='company-name'], [itemprop='hiringOrganization']"),
    jsonLd: Array.from(document.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"), (script) => script.textContent ?? ""),
    visibleText: (visibleRoot?.innerText ?? "").split(/\n\s*Apply for this job\b/i)[0]
  };
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== "object" || (message as { type?: unknown }).type !== "READ_CURRENT_JOB") return;
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url?.startsWith("https://")) throw new Error("Open a secure job posting tab first.");
      const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPageSnapshot });
      sendResponse({ ok: true, job: extractCurrentJob(injection.result) });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "The job page could not be read." });
    }
  })();
  return true;
});

