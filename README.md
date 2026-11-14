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
- Local creation and download of a tailored DOCX copy after an approved rewrite
- User-reviewed local autofill that preserves existing answers and never submits
- Local application tracking with duplicate prevention and outcome updates
- Explicit cloud choice when Gemini Nano is unavailable
- Production and private debug builds
- Packaged ZIP for judge installation

Original DOCX files are stored in extension-local IndexedDB when imported. Existing text-only imports must be re-imported once before their first tailored download; the file remains local.

## Build

```text
npm install
npm run verify
```

Load `dist/` from `chrome://extensions` with Developer mode enabled. The public build keeps local features available and disables cloud tailoring because Manifest V3 cannot load the web reCAPTCHA attestation script.

For a private App Check debug build:

```text
npm run build:debug
```

For a portable private judge build, set `JOB_COPILOT_APP_CHECK_DEBUG_TOKEN` to an already registered token, then run `npm run build:judge` and `npm run package`. The separate `-private-judge.zip` filename prevents confusion with the public package. The build fails if the token is missing, and the generated `dist/` and `release/` directories are ignored.

Never publish a debug build or commit an App Check debug token. A private judge build and token may be shared only through Devpost's private testing instructions.

## Privacy boundary

Imported DOCX résumés, the locally learned professional profile, candidate-vault answers, and reviewed job pages remain in the user's Chrome profile. The on-device model recommends a résumé and selects exact excerpts for tailoring; it does not silently fall back to cloud AI. Vault answers are not included in either AI path. Local autofill scans only visible form fields after a click, previews the proposed values, preserves existing answers, excludes sensitive demographic and EEO fields, and never submits. Cloud tailoring receives only the exact job requirement, one résumé section, and verified professional evidence the user reviews and approves. It never receives a full stored résumé or candidate vault. After an approved rewrite, the extension replaces that exact original section in a local DOCX copy and refuses missing or ambiguous matches. A fictional one-click payload remains available for judge testing.

## License

Apache-2.0. Copyright 2026 InDigitual, LLC.

