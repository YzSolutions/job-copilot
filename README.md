# InDigitual Ventures — Hybrid Job Copilot

Sprint 1 technical proof for the Google #BuildHybridAI 2026 hackathon. The Chrome extension demonstrates two deliberately separate Firebase AI Logic paths:

- `ONLY_ON_DEVICE` for private résumé matching with Gemini Nano in Chrome.
- `ONLY_IN_CLOUD` only after the user previews and approves the exact professional content being transmitted.

The interface reports the inference source and never silently falls back from local to cloud.

## Current Sprint 1 scope

- Manifest V3 side-panel extension
- Fictional job and résumé fixtures
- Structured local résumé recommendation
- Consent-gated cloud section patch
- Production and private debug builds
- Packaged ZIP for judge installation

Autofill, real résumé import, tracking and DOCX generation are intentionally deferred to later sprints.

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

Never publish a debug build or commit an App Check debug token. A private judge build and token may be shared only through Devpost's private testing instructions.

## Privacy boundary

The cloud proof receives only fictional job requirements, one résumé section and verified professional evidence. It does not receive identity, contact, citizenship, sponsorship, clearance, veteran, disability, demographic or EEO data.

## License

Apache-2.0. Copyright 2026 InDigitual, LLC.

