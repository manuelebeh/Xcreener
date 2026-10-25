# ADR-005 - Distribution, auto-updates, and code signing

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.4

## Context

Phase 0 requires installable desktop builds and a test update channel before MVP capture work. Code signing certificates are not yet provisioned; the pipeline must support unsigned builds now and signed releases later without rework.

## Decision

### Release artifacts

| Platform | Format | CI matrix |
|----------|--------|-----------|
| macOS Apple Silicon | `.dmg` (aarch64) | `macos-latest` |
| macOS Intel | `.dmg` (x86_64) | `macos-latest` |
| Windows | `.msi` / `.exe` (NSIS) | `windows-latest` |

- **PR / main builds:** `.github/workflows/build.yml` - unsigned smoke builds.
- **Releases:** `.github/workflows/release.yml` - triggered on tag `v*` only; draft GitHub Release; signed updater metadata. The app is built without secrets, then bundled and signed in a separate job (GitHub environment `release`, required reviewers) that installs the Tauri CLI from crates.io and nothing from npm; artifacts get a build provenance attestation.

### Tauri updater

- Plugin: `tauri-plugin-updater` + `@tauri-apps/plugin-updater` (frontend).
- **Signature:** Ed25519 key pair (`tauri signer generate`). Public key in `tauri.conf.json`; private key in the `release` environment secret `TAURI_SIGNING_PRIVATE_KEY`.
- **Endpoint (test channel):** GitHub Releases latest manifest:
  ```
  https://github.com/manuelebeh/Xcreener/releases/latest/download/latest.json
  ```
- **UX:** silent check on startup; manual "Check for updates" in Settings.
- **CSP:** `connect-src` includes `https://github.com` and `https://api.github.com`.

Updater signing is **distinct** from macOS Developer ID / Windows Authenticode code signing.

### Code signing (deferred)

Until certificates are available:

- Builds remain **unsigned** (Gatekeeper / SmartScreen warnings expected).
- `docs/guides/release-signing.md` documents required secrets.
- CI uses conditional env blocks - signing activates when secrets are present.

Required secrets (future):

| Secret | Platform |
|--------|----------|
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` | macOS notarization |
| Windows Authenticode cert (bundle job env in `release.yml`) | Windows |
| `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Updater manifest |

### Versioning

- App version: `tauri.conf.json` + `apps/desktop/package.json` (keep in sync).
- Release tags: SemVer `v0.x.y`; test channel may use `v0.1.0-test` draft releases.

## Consequences

- Release Please + CHANGELOG remains deferred to Phase 1.
- First production signing requires Apple Developer Program + Windows OV/EV cert budget.
- Custom domain (`releases.snapglow.app`) can replace GitHub endpoint later without client changes if `latest.json` shape is preserved.

## References

- [release-signing.md](../../guides/release-signing.md)
- [ADR-001](./001-monorepo-and-module-architecture.md)
- [Technical Stack - Desktop.md](../desktop-stack.md) §9
