# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities through [GitHub Security Advisories](https://github.com/Mutantcat-Working-Group/TalkWithYourAI/security/advisories/new).

**Do not open a public issue for security vulnerabilities.**

Your report should include:

- A descriptive title
- Severity assessment (Critical / High / Medium / Low)
- Affected component(s)
- Steps to reproduce
- Impact description

We will acknowledge your report within 72 hours and aim to release a fix within 14 days for critical issues.

## Security Model

TalkWithYourAI follows a **Bring Your Own Key (BYOK)** model:

- All API keys are stored locally on the user's machine via `tauri-plugin-store`
- No cloud account, no server-side storage, and no backend service is part of this product
- Audio data is sent directly from the user's machine to the STT/LLM provider the user configured
- The application does not collect telemetry or usage data
- CSP is enabled in the Tauri webview

## Out of Scope

The following are not considered vulnerabilities:

- Prompt injection in LLM responses (no security boundary to bypass)
- Users exposing their own API keys through misconfiguration
- Issues requiring physical access to the user's machine
- Vulnerabilities in third-party STT/LLM provider APIs
