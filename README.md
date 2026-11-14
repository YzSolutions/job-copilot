# InDigitual Ventures — Job Copilot

Sprint 1 technical proof for the Google #BuildHybridAI 2026 hackathon. The Chrome extension demonstrates two deliberately separate Firebase AI Logic paths:

- `ONLY_ON_DEVICE` for private résumé matching with Gemini Nano in Chrome.
- `ONLY_IN_CLOUD` only after the user previews and approves the exact professional content being transmitted.

The interface reports the inference source and never silently falls back from local to cloud.

## Current scope

- Manifest V3 side-panel extension
- Fictional job and résumé fixtures
- Local-only import and storage of up to five DOCX résumés
- Local candidate vault that shows the remaining reusable application questions
- On-demand local extraction and review of the active job page
- Structured local résumé recommendation and professional profile
- Local selection of an exact job requirement, résumé section, and supporting evidence
- Consent-gated cloud rewrite of only that reviewed professional content
- Explicit cloud choice when Gemini Nano is unavailable
- Production and private debug builds
- Packaged ZIP for judge installation

Autofill, tracking and DOCX generation are intentionally deferred to later sprints.

## Build

```text
npm install
npm run verify
```

Load `dist/` from `chrome://extensions` with Developer mode enabled. Firebase AI Logic and App Check are configured for the InDigitual Job Copilot Firebase project.

For a private App Check debug build:

```text
npm run build:debug
```

To embed an already registered token in a private judge build, set `JOB_COPILOT_APP_CHECK_DEBUG_TOKEN` only for that local build. The generated `dist/` directory is ignored and must be rebuilt in production mode before publishing.

Never publish a debug build or commit an App Check debug token. A private judge build and token may be shared only through Devpost's private testing instructions.

## Privacy boundary

Imported DOCX résumés, the locally learned professional profile, candidate-vault answers, and reviewed job pages remain in the user's Chrome profile. The on-device model recommends a résumé and selects exact excerpts for tailoring; it does not silently fall back to cloud AI. Vault answers are not included in either AI path. Cloud tailoring receives only the exact job requirement, one résumé section, and verified professional evidence the user reviews and approves. It never receives a full stored résumé or candidate vault, including phone, address, authorization, veteran, disability, demographic, or EEO data. A fictional one-click payload remains available for judge testing.

## License

Apache-2.0. Copyright 2026 InDigitual, LLC.

