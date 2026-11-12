<div align=center>
<img src="src-tauri/icons/128x128@2x.png" style="width:100px;" width="100"/>
<h2>TalkWithYourAI</h2>
</div>

### 1. Overview

- A lightweight desktop voice-input tool: press the hotkey, speak, and get polished text dropped straight into whatever app you were already using.
- Fully local: no account, no backend service, no license check, no telemetry. Speech recognition and AI polish only talk to the providers you configure.
- Bring your own key: both speech recognition and AI polish accept your own key, and your own base URL for self-hosted or local models.
- Ships for macOS, Windows and Linux, with dual-architecture installers on macOS and Windows.

Why it exists:

- Speak naturally, get written text. Thinking-aloud fillers (um, uh, you know, 呃, 嗯, 就是) are removed, punctuation added, and the result is ready to send.
- It knows where you are typing. The active app is classified as email, work chat, document, code surface, terminal and so on, and the tone and layout follow.
- It knows what you are saying. Around 450 built-in developer-term corrections turn `code x` into `Codex` and `min io` into `MinIO`.
- Configure once, use indefinitely. All data lives in a local SQLite file; the keys are yours to change.

### 2. Features

#### Voice input

- Global hotkey recording, either hold-to-talk or press-to-start/stop.
- A floating capsule shows the recording, transcribing, polishing and output stages.
- Text is typed character by character via keyboard simulation, or pasted through the clipboard; both can act as a fallback.
- The recording limit follows the selected provider automatically and can also be set by hand.

#### AI polish

- The transcript is cleaned by an LLM: punctuation added, fillers removed, repetitions merged, self-corrections resolved.
- Four built-in polish styles (Minimal, Clean, Structured, Professional), plus your own custom style prompt.
- Long input (roughly 120 CJK characters or 45 words) covering several points is turned into a bulleted list.
- Context-aware typo fixing: `函树` becomes `函数` in a code editor, while an email is judged against business vocabulary.
- A failed polish no longer degrades silently: you are asked whether to retry (unlimited) or insert the raw transcript.

#### App awareness

- The foreground app is classified into email, work chat, personal chat, document, project management, developer collaboration, prompt/code, support, social, or terminal.
- Each app family can carry its own writing style, and a specific app can override it.
- Classification and mappings are local; only the internal category label is sent to the LLM, never window titles or document contents.

#### Terminal handling

- Terminal apps are recognised: Terminal, iTerm2, Warp, Ghostty, Alacritty, kitty, WezTerm, AntShell, Windows Terminal, PowerShell and friends.
- In a terminal a newline is emitted as a backslash plus Enter (shell line continuation), so a command is not submitted mid-sentence.
- Other apps are untouched: normal text still gets normal newlines.

#### Ask Anything

- A separate hotkey, a spoken question, and only the answer is shown: no chat history, no input box, no send button.
- With text selected, you can also ask "what does this mean" or "summarise this".

#### Local data

- History, dictionary, correction rules, scenes and app mappings all live in a local SQLite database with full-text search and date grouping.
- The dictionary imports and exports JSON / CSV; scenes import and export JSON.
- API keys are stored in the OS credential vault (macOS Keychain, Windows Credential Manager, Linux Secret Service) with an encrypted local fallback.

#### Supported providers

Speech recognition:

```text
Provider                      Notes
Deepgram Nova-3              streaming
AssemblyAI                   streaming
Alibaba Qwen3 ASR Realtime   streaming, region selectable
Volcengine Doubao ASR        streaming
Zhipu GLM-ASR                file upload
OpenAI Whisper               file upload
Groq Whisper                 file upload
SiliconFlow                  file upload
Apple Speech                 on-device, macOS only
Local / custom Whisper       your own base URL and model, key optional
```

AI polish:

```text
Provider                      Notes
Zhipu
DeepSeek
SiliconFlow
OpenAI
Google Gemini
Moonshot (Kimi)
Doubao (Volcengine)
Qwen
Groq
Claude                       native Messages API
Ollama                       local, no key
OpenRouter
Custom OpenAI-compatible     your own base URL and model, key optional
```

### 3. Download and install

Download the installer for your platform from [Releases](https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases):

```text
Platform   Arch            File
macOS      arm64 + x86_64  TalkWithYourAI_<version>_universal.dmg
Windows    x64             TalkWithYourAI_<version>_x64-setup.exe
Windows    arm64           TalkWithYourAI_<version>_arm64-setup.exe
Linux      amd64           TalkWithYourAI_<version>_amd64.deb
Linux      arm64           TalkWithYourAI_<version>_arm64.deb
Linux      amd64           TalkWithYourAI_<version>_amd64.AppImage
```

Every installer has a matching `<file>.checksums.txt` containing both an MD5 and a SHA-1 digest, plus aggregate `MD5SUMS` and `SHA1SUMS` files that work directly with `md5sum -c` / `sha1sum -c`.

The macOS build is ad-hoc signed and not notarized, so Gatekeeper blocks it on first launch. Right-click the app and choose Open, or run:

```sh
xattr -dr com.apple.quarantine /Applications/TalkWithYourAI.app
```

The Windows installer is not code-signed; SmartScreen may warn. Click "More info", then "Run anyway".

### 4. Getting started

#### Default shortcuts

```text
Platform   Dictation     Ask Anything     Translate selection
macOS      Fn            Fn+Space         Fn+LeftShift
Windows    Right Alt     Right Alt+Space  Right Alt+LeftShift
Linux      Ctrl+/        Ctrl+.           configurable in Settings
```

Cancel the current dictation, including while a polish-retry prompt is waiting: `Cmd+Escape` on macOS, `Ctrl+Escape` elsewhere.

#### First-run setup

1. Open the app and follow onboarding: pick a speech-recognition provider and enter its key (or a base URL for local Whisper).
2. Pick an AI-polish provider and enter its key (Ollama and custom endpoints may leave it empty).
3. Onboarding requires both connection tests to pass before continuing.
4. Grant microphone access; on macOS you must also tick the app under Privacy & Security → Accessibility, otherwise global hotkeys and keyboard output will not work.
5. Press the hotkey and start dictating.

#### Notes

- No sign-up, sign-in or online check happens on first launch.
- With AI polish disabled you get the punctuated raw transcript.
- Ollama and custom OpenAI-compatible endpoints need no key, only a correct base URL and model.
- Self-hosted OpenAI-compatible services may use plain `http://`; `localhost`, `127.0.0.1` and private LAN addresses are all allowed.

#### Demo

```sh
# Run from source (development)
npm install
npm run tauri dev

# Build a local installer
npm run tauri build
```

Bundles land in `src-tauri/target/release/bundle/`.

### 5. Configuration and data

#### Where things live

```text
Content                              Location
history / dictionary / corrections    talkwithyourai.db in the app data dir
window and other preferences          settings.json in the app data dir
API keys                              OS credential vault, service name TalkWithYourAI
```

#### Migrating from a previous install

This app uses a different bundle identifier, keyring service name and database filename than upstream OpenTypeless. They are two independent applications that can be installed side by side, so old data is not inherited automatically:

- History / dictionary / scenes: copy `opentypeless.db` from the old app data directory and rename it to `talkwithyourai.db`; the dictionary can also be exported as JSON / CSV and re-imported.
- Window preferences: `onboarding_completed` in `settings.json` decides whether onboarding runs again, so copying only the database means you will be walked through it once.
- API keys: re-enter them in the new app's settings.

### 6. Roadmap

- [X] Global hotkey recording and capsule state display
- [X] Character-by-character keyboard output with clipboard fallback
- [X] Ten-way app-context classification and per-app styling
- [X] Built-in polish styles and custom style prompts
- [X] Local dictionary, correction rules, scenes and app mappings
- [X] Dictionary JSON / CSV import-export, scene JSON import-export
- [X] History with retention policy
- [X] Ask Anything voice Q&A
- [X] Translation mode and selected-text handling
- [X] Terminal newline continuation
- [X] Automatic bullet formatting for long input
- [X] Context-aware typo correction
- [X] Retry-or-insert prompt on polish failure
- [X] Cancel-dictation shortcut
- [X] Developer terminology correction (450+ terms)
- [X] Dual-architecture installers for three platforms with dual-digest checksums
- [X] Fully local operation: no account, no backend, no telemetry
- [X] Update notice from GitHub Releases
- [ ] Signed auto-update (requires a Developer ID certificate and notarization, see below)

### 7. Notes

#### On auto-update

This app **does not ship a signed auto-updater**.

Two reasons: the macOS build is ad-hoc signed and not notarized, so there is no stable code identity to bind an update to; and there is no maintainer signing key, so an update payload could not be verified.

Instead the app queries the public GitHub Releases API at startup, and when a newer version exists it shows a notice linking to the release page. You download and install it yourself. Nothing is downloaded or executed automatically.

A signed auto-updater would first require a real Developer ID certificate and notarization; only then would a minisign key pair be meaningful.

#### On licensing

This project is derived from [tover0314-w/opentypeless](https://github.com/tover0314-w/opentypeless) under the MIT license. The original copyright notices are retained in `LICENSE` and `THIRD_PARTY_NOTICES.md`.

### 8. Previous versions

- https://github.com/tover0314-w/opentypeless
