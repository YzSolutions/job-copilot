# Sprint 1 judge test

The public repository and production ZIP do not contain an App Check debug token. Until packaged-extension production attestation is resolved, the organizer must provide the private judge build and registered debug token through Devpost's private testing instructions. Debug tokens are accepted by the hackathon rules and must never be committed to the repository.

1. Extract the organizer-provided private judge ZIP and open `chrome://extensions`.
2. Enable Developer mode and choose **Load unpacked**.
3. Select the extracted extension directory.
4. Pin the extension and click it to open the side panel.
5. Confirm the Gemini Nano availability status.
6. Choose **Analyze on device** and verify the source badge reads **ON DEVICE**.
7. Choose **Review cloud request** and inspect the exact fictional content.
8. Choose **Keep it local** and verify no cloud result is produced.
9. Reopen the request, approve it and verify the source badge reads **IN CLOUD**.

If Gemini Nano is unavailable, the local test must say that nothing was sent to the cloud. The cloud test remains a separate, explicit action.
