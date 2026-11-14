# Sprint 9 status — 2026-11-14

## Judge reliability

- Removed the web reCAPTCHA provider that Manifest V3 blocked at runtime.
- Public builds keep local features available and disable cloud tailoring visibly and fail-closed.
- Private judge builds use Firebase's documented App Check debug-token exchange without loading a remote script.
- `build:judge` refuses to run without an explicit registered token.
- Private judge packages use a distinct `-private-judge.zip` filename; local debug builds cannot be packaged accidentally.
- The judge script now covers the private build notice, no-Nano route, consent cancellation, cloud approval, autofill safety, local tracking, DOCX export, and the public local-only package.

## Exit checks

- [x] Type checking, 32 automated tests, production build, public package, dependency audit, and diff checks pass.
- [x] A private judge build completes with an injected non-repository test token and packages under the distinct private filename.
- [x] The installed debug extension opens without a new reCAPTCHA content-security-policy error.
- [x] The live fictional judge flow displays the exact consent payload, sends only the approved professional content, and returns a protected cloud rewrite.

Chrome still retains two diagnostic entries from the superseded reCAPTCHA build. No new entry was added by the current build; the history was left untouched.

## Parked user checks

- Test the unavailable-Nano route on a separate judge-like computer.
- Open a generated tailored résumé in Word and approve its visual layout.
- Provide the real registered debug token only when producing the final private judge ZIP for Devpost.
