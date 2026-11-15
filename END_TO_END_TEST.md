# Job Copilot 1.0 — owner acceptance test

Use the installed private debug build for this test. Keep the Chrome side panel visible. Stop and report the exact step if the observed result differs from the expected result.

This test does not submit an employer application. Cloud tailoring sends only the exact professional content shown in the consent window after you approve it.

## 1. Start cleanly

1. Open `chrome://extensions` and reload **InDigitual Hybrid Job Copilot (Debug)**.
2. Open the side panel.
3. Confirm the top shows **NOT RUN**, the Gemini Nano status, and the private judge-build notice.

Expected: no new reCAPTCHA content-security-policy error appears.

## 2. Load the five résumé variants

Choose these five DOCX files together:

1. `Yahya_Zia_Business_Architect.docx`
2. `Yahya_Zia_Enterprise_Architect.docx`
3. `Yahya_Zia_Enterprise_Transformation_and_AI_Enablement.docx`
4. `Yahya_Zia_Healthcare.docx`
5. `Yahya_Zia_Requirements_and_Process_Engineer.docx`

Expected: the panel lists five locally stored résumés. No résumé is uploaded to Firebase or Gemini Cloud.

## 3. Finish the local candidate vault

Review every saved value. Complete the remaining questions shown by the panel, then choose **Save locally**.

Expected: the values remain in this Chrome profile and are not included in either AI prompt.

## 4. Read a real job

1. Open one real job posting in a normal HTTPS tab.
2. Reopen Job Copilot and choose **Read current job page**.
3. Correct the title, company, or description if needed.
4. Choose **Save reviewed job locally**.

Expected: the saved title, company, and description match the visible posting.

## 5. Run on-device matching

Choose **Analyze and prepare on device**.

Expected:

- The badge changes to **ON DEVICE**.
- One of the five résumés is recommended.
- The learned professional profile and skills are accurate.
- The proposed job requirement, résumé section, and evidence are exact excerpts from the reviewed sources.
- Nothing is sent to cloud AI.

## 6. Review the minimized cloud request

1. Review and, if necessary, edit the three professional fields.
2. Choose **Review exact cloud request**.
3. Confirm the consent window contains only the displayed job requirements, one résumé section, and verified evidence.
4. Confirm it contains no name, email, phone, address, citizenship, sponsorship, clearance, salary, veteran, disability, demographic, or EEO answer.
5. Choose **Keep it local** once.

Expected: the window closes, no cloud result appears, and the badge does not change to **IN CLOUD**.

## 7. Approve one cloud rewrite

Open the exact request again and choose **Approve cloud request**.

Expected:

- The badge changes to **IN CLOUD**.
- The proposed rewrite uses only the verified evidence.
- It does not invent a title, employer, metric, skill, certification, or outcome.
- The original résumé remains unchanged.

## 8. Download and inspect the tailored résumé

1. Choose **Download tailored DOCX**.
2. Open the new file in Microsoft Word.
3. Compare the changed section with the approved cloud result.
4. Check headings, bullets, spacing, page breaks, headers, and footers.

Expected: only the approved section changed and the original DOCX is untouched.

## 9. Test reviewed autofill without submitting

1. Open an application form for the reviewed job.
2. Reopen Job Copilot and choose **Scan application form**.
3. Inspect every proposed field.
4. Approve the fill.

Expected: supported empty contact fields are filled; existing answers, password fields, uploads, demographic and EEO questions, and the employer's Submit button are untouched.

## 10. Test local tracking and persistence

1. Choose **Record current job as applied** only if the application was actually submitted by you; otherwise leave it unrecorded for this test.
2. If recorded, update its status once.
3. Close and reopen the panel.

Expected: the local record persists once without duplication and retains its status and tailored résumé filename.

## Final owner decisions

- [ ] The recommended résumé and learned profile are accurate.
- [ ] The cloud payload is acceptably minimized.
- [ ] The rewrite contains no invented claim.
- [ ] The tailored DOCX looks correct in Word.
- [ ] Reviewed autofill changes only approved fields.
- [ ] The tracker behavior is accurate.
- [ ] Job Copilot 1.0 is approved for the judge demo.

## Separate distribution checks

These do not block the owner acceptance test:

- Test the unavailable-Nano route on a separate judge-like computer.
- Complete Chrome Web Store publisher registration when public distribution begins.
- Build the final private judge ZIP with the real registered App Check debug token and share it only through private Devpost testing instructions.
