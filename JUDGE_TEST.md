# Sprint 1 judge test

The public repository and production ZIP do not contain an App Check debug token. Until packaged-extension production attestation is resolved, the organizer must provide the private judge build and registered debug token through Devpost's private testing instructions. Debug tokens are accepted by the hackathon rules and must never be committed to the repository.

1. Extract the organizer-provided private judge ZIP and open `chrome://extensions`.
2. Enable Developer mode and choose **Load unpacked**.
3. Select the extracted extension directory.
4. Pin the extension and click it to open the side panel.
5. Confirm the Gemini Nano availability status.
6. Choose **Analyze on device** and verify the source badge reads **ON DEVICE**.
7. Choose **Load fictional judge demo**, then **Review exact cloud request**, and inspect the displayed content.
8. Choose **Keep it local** and verify no cloud result is produced.
9. Reopen the request, approve it and verify the source badge reads **IN CLOUD** and the original section is unchanged.
10. Open a harmless test application form with empty first name, last name, email, phone, and demographic fields.
11. Click the extension toolbar icon again after navigating so Chrome grants temporary access to the new page.
12. Choose **Scan application form**, inspect the exact local preview, and approve it.
13. Verify supported contact fields are filled, existing and demographic fields remain unchanged, and the form is not submitted.
14. Choose **Record current job as applied**, change its status, close and reopen the panel, and verify the single local record persists without duplication.
15. After an approved non-fictional rewrite, choose **Download tailored DOCX** and verify a new local copy is downloaded while the original file remains unchanged. Re-import the selected résumé once if this build predates local source-file storage.

If Gemini Nano is unavailable, the local test must say that nothing was sent to the cloud. The cloud test remains a separate, explicit action.
