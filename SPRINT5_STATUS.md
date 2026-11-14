# Sprint 5 status — 2026-11-13

## Selective Cloud Tailoring

- Accepts only relevant job requirements, one user-selected résumé section, and verified professional evidence.
- Shows the exact minimized payload before consent and sends nothing when the user cancels.
- Uses Firebase AI Logic in `ONLY_IN_CLOUD` mode and verifies the reported inference source.
- Rejects a response that changes the supplied original section instead of returning a bound patch.
- Never reads candidate-vault data or sends a full stored résumé.
- Blocks known identity, contact, authorization, and clearance values from the local candidate vault before cloud review.
- Leaves the original local résumé unchanged and displays the proposed rewrite for review.
- Keeps a fictional judge demo available without exposing real candidate data.

## Exit checks

- [x] Input normalization discards unexpected candidate fields.
- [x] Consent preview contains only the three approved professional fields.
- [x] Cancellation path sends nothing.
- [x] Completed one live fictional rewrite in the installed extension; the badge reported `IN CLOUD` and the original section remained unchanged.
- [x] Passed type checking, 17 automated tests, production build, packaging, dependency audit, and diff checks.
