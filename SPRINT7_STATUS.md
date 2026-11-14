# Sprint 7 status — 2026-11-14

## Local Application Tracker

- Records the currently reviewed job only after the user clicks **Record current job as applied**.
- Stores title, company, source URL, status, and timestamps only in `chrome.storage.local`.
- Prevents duplicate records for the same source URL while preserving later outcome changes.
- Supports Applied, Recruiter screen, Interview, Offer, Rejected, and Withdrawn outcomes.
- Allows mistaken records to be removed.
- Does not monitor browsing, infer outcomes, sync to Firestore, or submit an application.

## Exit checks

- [x] Tracker normalization, duplicate prevention, and status validation pass 27 automated tests.
- [x] Type checking, production build, packaging, dependency audit, and diff checks pass.
- [x] Record, status update, persistence, duplicate prevention, and removal were verified in the installed extension; the temporary test record was removed afterward.
