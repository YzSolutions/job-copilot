# Sprint 1 status — 2026-11-13

## Passed

- The Manifest V3 extension builds, packages and installs unpacked in Chrome.
- The side panel opens and renders the privacy-first hybrid AI interface.
- Chrome detects Gemini Nano as `downloadable`.
- The production package contains only the five expected extension files at its root.
- After the language-options fix, the extension was reloaded, its stored warning was cleared, and reopening the panel produced no new Chrome extension warning.
- `npm run verify` passes type checking, four prompt/privacy tests, the production build and ZIP packaging.
- Firebase project `indigitual-job-copilot` and the web app are registered under InDigitual Ventures.
- Fraud Defense App Check is registered, and the private development debug token exchange returned HTTP 200 with a one-hour token.
- The Firebase web API key was checked against Project Settings and corrected after a copied letter `O` had been entered as the number `0`.
- Gemini Nano downloaded in Chrome and completed a real `ON_DEVICE` comparison of the fictional resumes with no cloud fallback. It recommended the business-architecture resume and explained the match and missing requirements.
- Firebase AI Logic is enabled on the Spark plan, and App Check shows `Registered (Enforced)` for the web app.
- A consent-gated `IN_CLOUD` test completed successfully after displaying the exact minimized fictional payload. The response rewrote only the selected resume section using the supplied verified evidence.
- Yahya Zia is registered for `#BuildHybridAI 2026` on Devpost as a solo Web/Chrome entrant. The `Job Copilot` draft is 3/5 steps complete; its overview, eligibility, disclosure, technology explanation, repository, and license details are saved.
- The source is public at https://github.com/YzSolutions/job-copilot under Apache-2.0.

## Not yet proven

- Production packaged-extension App Check: Manifest V3 blocks Google's remotely loaded reCAPTCHA script. Development works through a private debug token; the judge-safe production attestation path remains unresolved.
- The dedicated no-Nano cloud-choice control and automated fallback coverage are complete; judge-machine hardware validation remains parked.

## User tasks parked

1. Complete Chrome Web Store publisher registration when distribution work begins.

## Sprint 1 exit gate

Sprint 1 is complete when both real inference paths pass in the installed extension: Gemini Nano runs locally without network fallback, and Firebase AI Logic runs only after the user reviews and approves the exact minimized payload, with App Check enforcement verified.
