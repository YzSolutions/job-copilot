# Sprint 3 status — 2026-11-13

## Candidate Vault

- Candidate profile and reusable screening answers are stored only in `chrome.storage.local`.
- The vault contains name, application email, phone, address, work authorization, sponsorship, and clearance.
- Stored values are normalized, length-limited, and unexpected fields are discarded.
- Vault data is not read by either the on-device résumé prompt or the cloud-tailoring prompt.
- Demographic, EEO, veteran, disability, and custom autofill answers remain out of scope for this sprint.

## Exit checks

- [x] Saved nine verified candidate fields in the installed extension; phone remains blank.
- [x] Closed and reopened the side panel; the profile and five résumé variants persisted.
- [x] Résumé matching completed on-device and selected the Business Architect résumé at 95/100.
- [x] Cloud preview contained only fictional job requirements, résumé section, and verified professional evidence; it explicitly excluded candidate-vault and demographic fields. The request was kept local.
- [x] Type checking, 10 tests, production build, ZIP packaging, dependency audit, and diff checks passed.
