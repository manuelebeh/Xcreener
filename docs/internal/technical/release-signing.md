# Release signing & updater keys

Operational guide for signed SnapGlow desktop releases. **Phase 0 (Sprint 0.4):** updater Ed25519 keys are configured; macOS Developer ID and Windows Authenticode certificates are **not yet provisioned**.

## 1. Tauri updater (Ed25519)

Distinct from platform code signing - signs `latest.json` and update bundles.

### Generate key pair (once per team)

```bash
pnpm --filter @snapglow/desktop tauri signer generate -w ~/.tauri/snapglow.key
```

- **Public key:** committed in `apps/desktop/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- **Private key:** secret `TAURI_SIGNING_PRIVATE_KEY` of the GitHub environment `release` (contents of `.key` file, or path via `TAURI_SIGNING_PRIVATE_KEY_PATH` in local builds)
- **Password:** `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key is encrypted

> If the private key is lost, existing installs cannot verify new updates. Rotate pubkey in config and re-release.

### CI

`.github/workflows/release.yml` runs on tag push `v*` only, in three jobs:

1. **build**: `pnpm tauri build --no-bundle` per target. No secrets in this job, so no npm package (Vite plugins, transitive dependencies) can read the signing key.
2. **bundle**: GitHub environment `release`. Downloads the binary, installs `tauri-cli` from crates.io (`cargo install --locked`, same version as `@tauri-apps/cli`), then `cargo tauri bundle` with `createUpdaterArtifacts` and the signing key. Nothing from npm is installed here. Apple and Windows signing secrets go in this job's env.
3. **publish**: build provenance attestation (`actions/attest-build-provenance`) on every installer and update bundle, `latest.json` for the updater endpoint, draft release.

One-time setup in GitHub → Settings → Environments: create `release`, add required reviewers (and optionally restrict it to tags `v*`), and move `TAURI_SIGNING_PRIVATE_KEY` / `_PASSWORD` (and later `APPLE_*`, `WINDOWS_*`) into it as environment secrets.

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

Without these secrets, `build.yml` / `release.yml` produce **unsigned** `.dmg` files (Gatekeeper will block by default). Do not export empty `APPLE_*` env vars in CI: Tauri treats them as present and `security import` fails. Uncomment the Apple block in the `bundle` job of `release.yml` only after the secrets are set in the `release` environment.

## 3. Windows Authenticode

| Secret | Description |
|--------|-------------|
| Windows cert | OV or EV code signing certificate (`.pfx`), configured per [tauri-action](https://github.com/tauri-apps/tauri-action) docs |

Without a cert, Windows SmartScreen will warn on first install.

## 4. Workflows

| Workflow | Trigger | Signing |
|----------|---------|---------|
| `build.yml` | Push `main`, `workflow_dispatch` | Unsigned smoke builds |
| `release.yml` | Tag `v*` only, `bundle` job gated by the `release` environment | Updater signed in the `bundle` job; platform signing if Apple/Windows secrets set |

Releases are created as **drafts** until manually published.

## 5. Beta unsigned installs (Sprint 1.6)

Until Apple Developer ID and Windows Authenticode certificates are provisioned, beta builds are **unsigned** but installable with manual override.

### macOS (`.dmg`)

1. Download the `.dmg` from the draft GitHub Release (tag `v0.1.0-beta.*` or later).
2. Open the DMG and drag SnapGlow to Applications.
3. On first launch, Gatekeeper may block the app. Right-click SnapGlow → **Open** → confirm **Open** again.
4. Alternatively: **System Settings → Privacy & Security → Open Anyway** after the first blocked launch.

### Windows (`.msi` / `.exe`)

1. Download the installer from the draft release.
2. If SmartScreen shows “Windows protected your PC”, click **More info** → **Run anyway**.
3. Complete the installer; launch SnapGlow from the Start menu.

### Updater secrets checklist (GitHub → Settings → Secrets)

| Secret | Required for beta updater | Notes |
|--------|---------------------------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Yes (recommended) | Signs `latest.json` + update bundles |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | If key encrypted | - |
| `APPLE_*` | No (unsigned macOS) | Add secrets, then uncomment the Apple block in `release.yml` |
| Windows `.pfx` / Authenticode | No (unsigned Windows) | See section 3 + commented block in `release.yml` |

### Trigger a beta release

```bash
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
```

CI runs `.github/workflows/release.yml` → draft release with macOS (aarch64 + x86_64) + Windows artifacts.

### Post-build smoke (manual)

- [ ] Fresh install → capture → history shows entry → reopen in editor → export PNG
- [ ] Updater dialog loads (if `TAURI_SIGNING_PRIVATE_KEY` is set)

## 6. Local release test

Same two steps as CI (build without the key, then bundle with it):

```bash
pnpm --filter @snapglow/desktop tauri build --no-bundle --target aarch64-apple-darwin
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/snapglow.key)"
pnpm --filter @snapglow/desktop tauri bundle --target aarch64-apple-darwin \
  --config '{"bundle":{"createUpdaterArtifacts":true}}'
```

## 7. Paid-plan entitlements (Ed25519)

The desktop app only trusts a paid plan signed by the API (`GET /v1/me/entitlement`) and checks the signature in Rust (`src-tauri/src/entitlement.rs`). This key pair is separate from the updater key.

```bash
pnpm --filter @snapglow/api exec tsx scripts/generate-entitlement-keys.ts
```

| Value | Where | Secret? |
|-------|-------|---------|
| `ENTITLEMENT_PRIVATE_KEY` | API environment (prod host, `apps/api/.env.local` in dev) | Yes |
| `SNAPGLOW_ENTITLEMENT_PUBLIC_KEY` | GitHub → Settings → Variables (Actions), read by `release.yml` / `build.yml`; your shell for local builds | No |

`release.yml` fails when the variable is missing: a build without it treats every paying account as free. Rotating the pair logs every desktop out of its paid plan until it reaches the API again.

## References

- [ADR-005](./adr/005-distribution-updates-and-signing.md)
- [Tauri updater](https://v2.tauri.app/plugin/updater/)
- [Tauri signing](https://v2.tauri.app/security/signer/)
