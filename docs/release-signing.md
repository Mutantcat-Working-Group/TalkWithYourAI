# Release Signing Setup

TalkWithYourAI releases are built and published from this repository
(`Mutantcat-Working-Group/TalkWithYourAI`).

## Current state

This repository has no release workflow yet. Only check-style CI (`ci.yml`)
plus the issue/PR hygiene workflows run here today, so the signing
configuration below is the prerequisite checklist for the release pipeline
that will be added as a follow-up task.

## Required GitHub Secrets

Set these secrets on `Mutantcat-Working-Group/TalkWithYourAI`, because that
repository runs the GitHub Actions workflow.

macOS:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- `APPLE_EXPECTED_SIGNER_SHA256`: lowercase SHA-256 digest of the leaf Developer ID Application certificate

Tauri updater:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Linux:

- `LINUX_GPG_PRIVATE_KEY`: base64-encoded ASCII-armored private GPG key
- `LINUX_GPG_KEY_ID`: GPG key ID or fingerprint
- `LINUX_GPG_PASSPHRASE`: GPG key passphrase
- `LINUX_EXPECTED_GPG_FINGERPRINT`: full primary-key fingerprint trusted by the final release gate

Windows PFX fallback:

- `WINDOWS_CERTIFICATE`: base64-encoded PFX code signing certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: required when `WINDOWS_CERTIFICATE` is set
- `WINDOWS_TIMESTAMP_URL`: optional timestamp server URL; defaults to DigiCert

Windows SignPath:

- `SIGNPATH_API_TOKEN`: token for a SignPath user that is a submitter for the
  selected signing policy
- `SIGNPATH_ORGANIZATION_ID`: SignPath organization ID
- `SIGNPATH_PROJECT_SLUG`: SignPath project slug
- `SIGNPATH_SIGNING_POLICY_SLUG`: SignPath signing policy slug
- `WINDOWS_EXPECTED_SIGNER_THUMBPRINT`: thumbprint of the trusted production Authenticode leaf certificate

The SignPath project and GitHub trusted build system must point at this
repository, because this repository runs the GitHub Actions workflow and owns
the GitHub artifact submitted to SignPath. Signed Windows artifacts are
published to this repository's GitHub Release.

The Windows SignPath workflow uses the project's default artifact
configuration. This default artifact configuration must have a `<zip-file>`
root because GitHub's `actions/upload-artifact` action stores files as a ZIP
archive.

Signing policies whose slug starts with `test-` or `test_` are dry-run only.
They may verify the build-to-SignPath integration, but the workflow refuses to
publish those installers to a production GitHub Release. Publishing requires a
production SignPath policy, an Authenticode result of `Valid`, and an exact
match with `WINDOWS_EXPECTED_SIGNER_THUMBPRINT`.

Windows installers are published only through the dedicated `Release Windows`
workflow. The general `Release macOS and Linux` workflow has no Windows path.
`signing_mode: signpath` requires the production signer and remains the
recommended default. `signing_mode: unsigned` is an explicit release-operator
exception: the workflow requires both installers to be completely unsigned and
still enforces Tauri updater signatures, checksums, pinned source provenance,
and the final asset gate. Test-signed or invalidly signed installers are never
accepted as unsigned. Unsigned installers may show Windows SmartScreen or
Unknown Publisher warnings.

## Tauri Updater Key

The updater plugin is enabled with `createUpdaterArtifacts: true`, so every
build produces signed update artifacts. The public key in
`src-tauri/tauri.conf.json` must belong to a key pair generated for this
project.

**Do not ship a build with the upstream project's updater public key.** A
signature produced by the upstream private key would pass verification in this
app, which means a third party could publish an update that this application
accepts as genuine.

Generate a fresh key pair and store the private half in CI secrets:

```bash
npx tauri signer generate -w ~/.tauri/talkwithyourai.key
```

Put the printed public key into `updater.pubkey` in
`src-tauri/tauri.conf.json`, and store `TAURI_SIGNING_PRIVATE_KEY` (the
private key contents) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as secrets on
this repository. Until this is done, update checks fail signature
verification and fail silently with a warning; the app keeps working but no
update can be installed.

The updater `endpoints` value must point at this repository:

```
https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/latest/download/latest.json
```

Release downloads redirect to `objects.githubusercontent.com`, so the CSP in
`src-tauri/tauri.conf.json` must allow that domain as well.

## Windows Certificate Notes

Use a real code signing certificate. SSL/TLS certificates do not sign Windows
desktop apps. EV certificates get Microsoft SmartScreen reputation immediately;
OV certificates can still show SmartScreen warnings until reputation builds.

If you receive a `.pfx`, encode it before saving it as a GitHub secret:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) |
  Set-Content -NoNewline windows-certificate-base64.txt
```

Save the content of `windows-certificate-base64.txt` as `WINDOWS_CERTIFICATE`.

## Linux GPG Notes

Generate a release-only GPG key, export it, and base64 encode it:

```bash
gpg --full-gen-key
gpg --armor --export-secret-keys "TalkWithYourAI Release" > talkwithyourai-linux-private.asc
openssl base64 -A -in talkwithyourai-linux-private.asc -out talkwithyourai-linux-private.asc.base64
gpg --list-secret-keys --keyid-format LONG
```

Save `talkwithyourai-linux-private.asc.base64` as `LINUX_GPG_PRIVATE_KEY`, the
fingerprint/key ID as `LINUX_GPG_KEY_ID`, and the passphrase as
`LINUX_GPG_PASSPHRASE`.

The workflow embeds an AppImage signature, signs RPM bundles through Tauri,
creates detached `.asc` signatures for Linux artifacts, and uploads
architecture-specific checksum manifests such as `SHA256SUMS-linux-x86_64.txt`
and `SHA256SUMS-linux-aarch64.txt`.

## Release Flow

Freeze the repository's `main` branch from the moment the official tag is
created until the release is finalized. Every stage pins and rechecks the
official Tag SHA and the CI/CD build SHA, and each provenance manifest binds
its platform assets to the exact SHA used for the build. Any application,
dependency, or packaging-input change after the build intentionally stops the
release.
