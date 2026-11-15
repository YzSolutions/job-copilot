# Sprint 10 status — 2026-11-15

## Release candidate

- Promoted the extension and package metadata to version `1.0.0`.
- Package filenames now derive from the project version instead of a hard-coded value.
- Packaging fails if the Chrome manifest and project versions drift.
- Consolidated all owner acceptance tasks into one end-to-end product test.
- Updated the public README, judge script, and Devpost draft for the release candidate.

## Exit checks

- [x] Type checking and all 32 automated tests pass.
- [x] The public `1.0.0` package builds, fails closed for cloud AI, and contains no debug token.
- [x] The private judge `1.0.0` package builds only with an injected test token and uses a distinct filename.
- [x] Archive inspection confirms the injected test token appears only in the private judge package.
- [x] Dependency audit and diff checks pass.
- [x] The `1.0.0` debug build is staged in `dist/` for owner acceptance testing. Reloading the installed extension is the first owner step.

## Owner acceptance

Follow `END_TO_END_TEST.md` with Codex. The test covers the five résumés, local vault, real job extraction, on-device matching, minimized cloud consent, tailored DOCX, reviewed autofill, tracking, and persistence without automatically submitting an employer application.
