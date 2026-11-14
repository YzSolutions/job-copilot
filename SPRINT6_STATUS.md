# Sprint 6 status — 2026-11-14

## User-Reviewed Local Autofill

- Scans only visible supported fields inside forms after the user clicks **Scan application form**.
- Matches common name, contact, address, authorization, sponsorship, clearance, salary, availability, relocation, travel, and LinkedIn fields to the local candidate vault.
- Shows every proposed field and value before making a page change.
- Preserves every field that already contains an answer.
- Excludes veteran, disability, gender, sex, race, ethnicity, pronoun, birth, SSN, marital, religion, national-origin, and EEO questions.
- Excludes passwords, search boxes, hidden controls, uploads, radio buttons, checkboxes, and submission controls.
- Revalidates field identity immediately before filling so changed forms are skipped.
- Dispatches normal input and change events for modern application sites.
- Never submits an application and does not use either AI route.

## Exit checks

- [x] Autofill matching, sensitive-field exclusion, existing-answer preservation, and input normalization are covered by automated tests.
- [x] Type checking and 25 automated tests pass.
- [x] Verified scan, exact preview, cancellation, approved filling, existing-answer preservation, and no submission in the installed extension using a harmless form and fictional test value.
- [x] Final production build, release ZIP packaging, dependency audit, and diff checks pass.

## Live-test findings

- Chrome's privacy-limited `activeTab` access must be granted again by clicking the extension after navigating to a new application page.
- Standard visible controls inside a normal HTML form work. Custom controls and cross-origin iframe forms still need site-specific adapters.
- The initial source badge now reads **NOT RUN**, separately from Gemini Nano availability, removing the earlier judge-facing ambiguity.
