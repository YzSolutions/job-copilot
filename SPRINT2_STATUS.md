# Sprint 2 status — 2026-11-13

## In progress

- Five local résumé variants selected by Yahya Zia.
- Local-only DOCX import and Chrome-profile storage added.
- Multiple file selections merge safely so users can add or replace résumé variants without losing earlier imports.
- All five selected DOCX files parsed successfully in the local verification run; no résumé content or filename was added to the source or production bundle.
- Imported résumé text is used only by the `ONLY_ON_DEVICE` comparison.
- Full résumé variants are scored one at a time on-device, preventing the five-document prompt from exceeding Gemini Nano's input limit.
- Gemini Nano unavailable state offers a separate, explicit fictional cloud test; no automatic fallback exists.
- Private judge builds can receive a registered App Check debug token through a local environment variable that is never committed.
- Type checking, six automated tests, production build, ZIP packaging, and the production dependency audit pass.

## Exit checks

- Import all five selected DOCX files in the installed extension.
- Verify the stored résumé count and labels after reopening the side panel.
- Run an on-device comparison using the five imported résumés.
- Verify the unavailable-Nano message and separate cloud-consent path.
- Reload the existing unpacked extension in Chrome before the live import test.
