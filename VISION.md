# Vision

## What is TalkWithYourAI?

TalkWithYourAI is an open-source, cross-platform desktop application that converts speech to polished text using AI. It combines real-time speech-to-text with LLM-powered refinement, letting users speak naturally and get well-structured written output.

## Origin

TalkWithYourAI is a fork of an MIT-licensed open-source desktop dictation project that was built in a single day with the help of Claude Code. This fork keeps the same local-first, BYOK foundation and removes the account, subscription, and managed-cloud layer entirely, so the only identity is the user's own machine and the user's own API keys.

## Core Principles

- **Local only**: no accounts, no sign-in, no server-side storage. History, dictionaries, correction rules, scenes, and app mappings live in a local SQLite database on the user's machine.
- **Bring Your Own Key**: your API keys stay on your machine. No telemetry, no usage reporting.
- **No backend dependency**: the application itself contains no backend service, no authorization checks, and no remote configuration.
- **Cross-platform**: Windows, macOS, and Linux via Tauri.
- **Open source**: MIT licensed. Transparent development, community-driven roadmap.
- **Provider agnostic**: support multiple STT and LLM providers. No vendor lock-in.

## Current Priorities

1. Stability and reliability across all platforms
2. User experience polish
3. Broader STT provider support (Deepgram, AssemblyAI, Whisper variants, etc.)
4. Broader LLM provider support (OpenAI, DeepSeek, Anthropic, etc.)

## Future Directions

- Plugin / extension system for custom workflows
- Voice commands and shortcuts
- Optional local STT engines

## What We Won't Merge

- Features that break the local-only principle (mandatory accounts, telemetry, or any bundled backend)
- Forced vendor lock-in to a single provider
- Complexity that doesn't serve a clear user need
