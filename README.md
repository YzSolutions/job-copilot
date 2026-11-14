# InDigitual Ventures — Hybrid Job Copilot

Sprint 1 technical proof for the Google #BuildHybridAI 2026 hackathon. The Chrome extension demonstrates two deliberately separate Firebase AI Logic paths:

- `ONLY_ON_DEVICE` for private résumé matching with Gemini Nano in Chrome.
- `ONLY_IN_CLOUD` only after the user previews and approves the exact professional content being transmitted.

The interface reports the inference source and never silently falls back from local to cloud.

## Current scope

- Manifest V3 side-panel extension
- Fictional job and résumé fixtures
- Local-only import and storage of up to five DOCX résumés
- Local candidate vault for reusable identity, address, work-authorization, sponsorship, and clearance answers
- On-demand local extraction and review of the active job page
- Structured local résumé recommendation
- Consent-gated cloud section patch
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

Imported DOCX résumés, candidate-vault answers, and reviewed job pages remain in the user's Chrome profile. Résumés and reviewed job text are used only by the `ONLY_ON_DEVICE` comparison; vault answers are not included in either AI path. The cloud proof still receives only fictional job requirements, one fictional résumé section and fictional verified professional evidence. It does not receive captured job pages, identity, contact, citizenship, sponsorship, clearance, veteran, disability, demographic or EEO data.

## License

Apache-2.0. Copyright 2026 InDigitual, LLC.

