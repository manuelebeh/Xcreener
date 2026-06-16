# Release signing & updater keys

Operational guide for signed SnapGlow desktop releases. **Phase 0 (Sprint 0.4):** updater Ed25519 keys are configured; macOS Developer ID and Windows Authenticode certificates are **not yet provisioned**.

## 1. Tauri updater (Ed25519)

Distinct from platform code signing — signs `latest.json` and update bundles.

### Generate key pair (once per team)

```bash
pnpm --filter @snapglow/desktop tauri signer generate -w ~/.tauri/snapglow.key
```

- **Public key:** committed in `apps/desktop/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- **Private key:** GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (contents of `.key` file, or path via `TAURI_SIGNING_PRIVATE_KEY_PATH` in local builds)
- **Password:** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key is encrypted

> If the private key is lost, existing installs cannot verify new updates. Rotate pubkey in config and re-release.

### CI

`.github/workflows/release.yml` passes signing env vars to `tauri-apps/tauri-action`. Required for updater metadata on tag push `v*`.

## 2. macOS code signing & notarization

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` Developer ID Application certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Export password for the `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID email for notarization API |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character team ID |

**Prerequisites:** Apple Developer Program membership ($99/year).

Without these secrets, `build.yml` / `release.yml` produce **unsigned** `.dmg` files (Gatekeeper will block by default).

## 3. Windows Authenticode

| Secret | Description |
|--------|-------------|
| Windows cert | OV or EV code signing certificate (`.pfx`), configured per [tauri-action](https://github.com/tauri-apps/tauri-action) docs |

Without a cert, Windows SmartScreen will warn on first install.

## 4. Workflows

| Workflow | Trigger | Signing |
|----------|---------|---------|
| `build.yml` | Push `main`, `workflow_dispatch` | Unsigned smoke builds |
| `release.yml` | Tag `v*` | Updater signed if `TAURI_SIGNING_PRIVATE_KEY` set; platform signing if Apple/Windows secrets set |

Releases are created as **drafts** until manually published.

## 5. Local release test

```bash
# Set private key for local bundle
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/snapglow.key)"
pnpm --filter @snapglow/desktop tauri build
```

## References

- [ADR-005](./adr/005-distribution-updates-and-signing.md)
- [Tauri updater](https://v2.tauri.app/plugin/updater/)
- [Tauri signing](https://v2.tauri.app/security/signer/)
