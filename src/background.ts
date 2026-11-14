import { extractCurrentJob, type JobPageSnapshot } from "./job.js";
import type { ApplicationField, AutofillEntry } from "./autofill.js";

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

function collectApplicationFields(): ApplicationField[] {
  const elements = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("form input, form select, form textarea"))
    .filter((element) => !element.disabled && element.getClientRects().length > 0)
    .filter((element) => element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || ["text", "email", "tel", "url", "date", "number"].includes(element.type));
  return elements.map((element, index) => {
    const label = element.labels?.[0]?.innerText.trim()
      || element.getAttribute("aria-label")?.trim()
      || element.getAttribute("placeholder")?.trim()
      || element.name
      || element.id
      || `Field ${index + 1}`;
    const type = element instanceof HTMLSelectElement ? "select" : element instanceof HTMLTextAreaElement ? "textarea" : element.type;
    return {
      index,
      signature: `${index}|${element.tagName}|${element.id}|${element.name}|${type}`,
      label: label.slice(0, 200),
      name: element.name.slice(0, 200),
      id: element.id.slice(0, 200),
      autocomplete: element.autocomplete.slice(0, 100),
      type,
      value: element.value.trim().slice(0, 200),
      options: element instanceof HTMLSelectElement
        ? Array.from(element.options, (option) => option.value || option.text).slice(0, 100)
        : []
    };
  });
}

function applyApplicationEntries(entries: AutofillEntry[]): { filled: number; skipped: number } {
  const elements = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("form input, form select, form textarea"))
    .filter((element) => !element.disabled && element.getClientRects().length > 0)
    .filter((element) => element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || ["text", "email", "tel", "url", "date", "number"].includes(element.type));
  let filled = 0;
  for (const entry of entries.slice(0, 50)) {
    const element = elements[entry.index];
    if (!element || element.value.trim()) continue;
    const type = element instanceof HTMLSelectElement ? "select" : element instanceof HTMLTextAreaElement ? "textarea" : element.type;
    if (`${entry.index}|${element.tagName}|${element.id}|${element.name}|${type}` !== entry.signature) continue;
    let value = String(entry.value).trim().slice(0, 200);
    if (element instanceof HTMLSelectElement) {
      const option = Array.from(element.options).find((item) =>
        item.value.toLocaleLowerCase() === value.toLocaleLowerCase()
        || item.text.toLocaleLowerCase() === value.toLocaleLowerCase()
      );
      if (!option) continue;
      value = option.value;
    }
    const prototype = element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    filled += 1;
  }
  return { filled, skipped: entries.length - filled };
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  const request = message as { type?: unknown; entries?: unknown };
  if (!["READ_CURRENT_JOB", "SCAN_APPLICATION_FORM", "APPLY_APPLICATION_FORM"].includes(String(request.type))) return;
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url?.startsWith("https://")) throw new Error("Open a secure job posting tab first.");
      if (request.type === "READ_CURRENT_JOB") {
        const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectPageSnapshot });
        sendResponse({ ok: true, job: extractCurrentJob(injection.result) });
      } else if (request.type === "SCAN_APPLICATION_FORM") {
        const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectApplicationFields });
        sendResponse({ ok: true, fields: injection.result });
      } else {
        const entries = Array.isArray(request.entries) ? request.entries.filter((entry): entry is AutofillEntry =>
          entry && typeof entry === "object"
          && Number.isInteger((entry as AutofillEntry).index)
          && typeof (entry as AutofillEntry).signature === "string"
          && typeof (entry as AutofillEntry).label === "string"
          && typeof (entry as AutofillEntry).value === "string"
        ).slice(0, 50) : [];
        const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: applyApplicationEntries, args: [entries] });
        sendResponse({ ok: true, ...injection.result });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "The active page could not be used." });
    }
  })();
  return true;
});

