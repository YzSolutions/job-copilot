# Sprint 5 status — 2026-11-13

## Selective Cloud Tailoring

- Uses the on-device model to learn a short professional profile from the selected résumé and stores it locally.
- Shows the remaining common candidate questions and stores their answers only in the local Chrome profile.
- Reads the reviewed job locally and selects an exact job requirement, résumé section, and supporting evidence.
- Rejects locally generated tailoring details that are not exact excerpts from the job and résumé.
- Limits automatically selected text so a full résumé cannot be presented as the minimized cloud payload.
- Shows the exact minimized payload before consent and sends nothing when the user cancels.
- Uses Firebase AI Logic in `ONLY_IN_CLOUD` mode and verifies the reported inference source.
- Rejects a response that changes the supplied original section instead of returning a bound patch.
- Never includes candidate-vault data or sends a full stored résumé.
- Blocks every known candidate-vault answer from the résumé section and evidence before cloud review.
- Leaves the original local résumé unchanged and displays the proposed rewrite for review.
- Keeps a fictional judge demo available without exposing real candidate data.

## Exit checks

- [x] Input normalization discards unexpected candidate fields.
- [x] Consent preview contains only the three approved professional fields.
- [x] Cancellation path sends nothing.
- [x] Completed one live fictional rewrite in the installed extension; the badge reported `IN CLOUD` and the original section remained unchanged.
- [x] Rechecked the installed extension with five real résumés: Gemini Nano learned the local profile, selected the Business Architect résumé, and prepared grounded résumé evidence without a cloud request.
- [x] Final production build, package, 22 automated tests, dependency audit, and diff checks passed.
