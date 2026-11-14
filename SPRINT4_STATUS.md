# Sprint 4 status — 2026-11-13

## Local Job Intelligence

- Reads the active HTTPS job page only after the user clicks the extension action and then clicks **Read current job page**.
- Prefers structured `JobPosting` metadata, with visible title, company, and page text as the fallback.
- Displays extracted job content for review and correction before saving it in `chrome.storage.local`.
- Uses the reviewed real job description for `ONLY_ON_DEVICE` résumé matching.
- Does not read form values, browse automatically, submit applications, or send captured job text to cloud AI.

## Exit checks

- [x] Extracted the live Alpaca **Senior Business Architect** posting; title, company, and job text were captured without the application form.
- [x] Closed and reopened the side panel; the reviewed job persisted in local Chrome storage.
- [x] Compared all five local résumés with Gemini Nano. The visible result was **ON DEVICE**, 95/100, recommending the Business Architect résumé.
- [x] Ran type checking, 14 automated tests, production build, packaging, dependency audit, and diff checks.
