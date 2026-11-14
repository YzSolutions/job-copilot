# Sprint 8 status — 2026-11-14

## Tailored Résumé DOCX

- Stores newly imported original DOCX files only in extension-local IndexedDB.
- Associates an approved cloud rewrite with the exact locally selected résumé section.
- Creates a new DOCX copy and never changes the original file.
- Replaces the exact original section across Word text runs while retaining the remaining DOCX package.
- Refuses generation when the approved section is missing or appears more than once.
- Uses a Windows-safe, job-specific filename.
- Links the generated filename to a matching locally tracked application when one exists.
- Does not send the full résumé, candidate vault, generated document, or tracker data to cloud AI.

## Earlier-sprint closure

- The initial inference badge now says **NOT RUN** instead of conflicting with Nano availability.
- Unsupported or unavailable Nano displays a first-screen button leading to the separate consent-gated cloud path.
- Automated fallback coverage confirms that the message says nothing was sent and does not imply automatic cloud fallback.

## Exit checks

- [x] Exact DOCX replacement, ambiguity rejection, package preservation, filename safety, fallback routing, and tracker linking pass 32 automated tests.
- [x] Type checking, production build, packaging, dependency audit, and diff checks pass.
- [x] The installed extension shows the corrected **NOT RUN** badge and tailored-file state. Chrome diagnostics contained only the previously documented App Check/reCAPTCHA CSP blocker and no new Sprint 8 runtime error.

## Parked external checks

- Open a generated real résumé in Word and visually approve its layout.
- Test the unavailable-Nano path on separate judge-like hardware.
- Resolve production packaged-extension App Check attestation or distribute the documented private judge build.
