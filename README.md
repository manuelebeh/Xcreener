# SnapGlow

Privacy-first screenshot app — capture, beautify, and share. Local-first; optional cloud links (Sprint 2b.5).

## Monorepo

| Path | Description |
|------|-------------|
| `apps/desktop` | Tauri v2 + React (menu-bar desktop app) |
| `apps/web` | TanStack Start landing + public share viewer (`/s/:token`) |
| `apps/mobile` | Expo SDK 56 + React Native (`@snapglow/mobile`) |
| `apps/api` | Fastify API — cloud shares, Auth0 JWT (`@snapglow/api`) |
| `packages/cloud-core` | Share types, expiry helpers (api + web + desktop) |
| `packages/design-tokens` | DTCG design tokens → CSS / Tailwind + `tokens.native` |
| `packages/ui` | Shared React web components + Storybook |
| `packages/ui-native` | Shared React Native components |
| `packages/editor-core` | Shared editor logic (layout, presets, annotations) |
| `packages/redaction-core` | On-device detectors + layout mapping (desktop + mobile) |
| `packages/style-suggestion-core` | Content class → style mapping (desktop) |
| `packages/ocr-core` | OCR types + text assembly helpers (desktop copy-text) |
| `packages/biome-config` | Shared Biome lint/format config |
| `packages/typescript-config` | Shared TypeScript configs |

See also [`apps/api/README.md`](apps/api/README.md) and [`.agents/rules/api.md`](.agents/rules/api.md).

## Prerequisites

- [mise](https://mise.jdx.dev/) (recommended) - installs Node 24, pnpm 9, Rust stable
- Or manually: Node ≥ 24, pnpm 9, Rust stable

## Quick start

```bash
mise trust
mise install
mise run install
mise run install-hooks
mise run tokens:build
mise run dev:desktop   # or: mise run dev:web, mise run dev:mobile, mise run dev:api
```

## Scripts (via mise)

| Command | Description |
|---------|-------------|
| `mise run dev:desktop` | Start Tauri dev server |
| `mise run dev:web` | Start landing dev server (port 3000) |
| `mise run dev:api` | Fastify API + Postgres + Redis + MinIO (port 8787) |
| `mise run dev:mobile` | Start Expo dev client (Metro) |
| `mise run dev:mobile:ios` | Build & run iOS simulator (development build) |
| `mise run dev:mobile:android` | Build & run Android emulator (development build) |
| `mise run storybook` | UI component library (port 6006) |
| `mise run tokens:build` | Build design token CSS |
| `mise run lint` | Biome check (Turbo) |
| `mise run typecheck` | TypeScript (Turbo) |
| `mise run test` | Unit tests Vitest (Turbo) |
| `mise run test:e2e:native` | Native integration tests (WebDriver on Linux/Windows; Rust tests on macOS) |
| `mise run format` | Biome write (Turbo) |
| `mise run build:desktop:arm64` | macOS `.dmg` (Apple Silicon) - run on macOS |
| `mise run build:desktop:intel` | macOS `.dmg` (Intel) - run on macOS |
| `mise run build:desktop:mac` | Both macOS `.dmg` targets - run on macOS |
| `mise run build:desktop:windows` | Windows `.msi` + `.exe` - run on Windows |

Rust: `cd apps/desktop/src-tauri && cargo test`

### Desktop release builds

Build on the **same OS** as the target (cross-compiling Windows from macOS is not supported here).

**macOS** - Apple Silicon or Intel dev machine:

```bash
mise run build:desktop:arm64   # Apple Silicon testers
mise run build:desktop:intel   # Intel Mac testers
mise run build:desktop:mac     # both DMGs
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg`

**Windows** - dev machine with [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2, MSVC):

```bash
mise run build:desktop:windows
```

Output:

- `apps/desktop/src-tauri/target/release/bundle/msi/*.msi`
- `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`

**All platforms via CI** - tag `v*` → draft GitHub Release with macOS (arm64 + x86_64) + Windows artifacts. Beta installs are unsigned until code-signing certs are configured - see [`docs/internal/technical/release-signing.md`](docs/internal/technical/release-signing.md).

Desktop e2e:
- Web smoke: `pnpm --filter @snapglow/desktop test:e2e`
- Native integration: `mise run test:e2e:native` (WebDriver on Linux/Windows; Rust tests on macOS)

Mobile (Expo development builds — not Expo Go):

```bash
mise run dev:mobile              # Metro dev client
mise run dev:mobile:ios          # first run runs prebuild + simulator
mise run dev:mobile:android      # requires Android Studio + emulator
```

Requires Xcode (iOS) or Android Studio (Android). See [`.agents/rules/mobile.md`](.agents/rules/mobile.md).

## Architecture

- Module layout: `apps/desktop/src/modules/{capture,editor,export,history,redaction,settings,cloud,style-suggestion,text-extraction,auto-crop}/`
- ADR: [`docs/internal/technical/adr/001-monorepo-and-module-architecture.md`](docs/internal/technical/adr/001-monorepo-and-module-architecture.md)
- ADR: [`docs/internal/technical/adr/002-design-tokens-ui-and-web.md`](docs/internal/technical/adr/002-design-tokens-ui-and-web.md)
- ADR: [`docs/internal/technical/adr/003-desktop-ipc-and-events.md`](docs/internal/technical/adr/003-desktop-ipc-and-events.md)
- ADR: [`docs/internal/technical/adr/004-system-integration-tray-shortcuts.md`](docs/internal/technical/adr/004-system-integration-tray-shortcuts.md)
- ADR: [`docs/internal/technical/adr/005-distribution-updates-and-signing.md`](docs/internal/technical/adr/005-distribution-updates-and-signing.md)
- ADR: [`docs/internal/technical/adr/009-cloud-api-and-sharing.md`](docs/internal/technical/adr/009-cloud-api-and-sharing.md)
- Accessibility: [`docs/internal/technical/accessibility-audit.md`](docs/internal/technical/accessibility-audit.md)
- Agent guide: [`AGENTS.md`](AGENTS.md)

## License

Private - see repository owner.
