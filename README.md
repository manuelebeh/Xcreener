# SnapGlow

Privacy-first screenshot app: capture, beautify, share. Everything runs on your machine. Cloud links exist, but only when you ask for one.

## Repository layout

pnpm + Turborepo monorepo, with Node and Rust pinned by [mise](https://mise.jdx.dev/).

| Path | What it is |
|------|------------|
| `apps/desktop` | Tauri 2 + React menu-bar app (macOS, Windows) |
| `apps/web` | TanStack Start landing page and public share viewer (`/s/:token`) |
| `apps/mobile` | Expo SDK 56 + React Native |
| `apps/api` | Fastify cloud API (shares, Auth0, teams, billing, collab WebSocket) |
| `apps/vscode-extension` | VS Code capture and beautify plugin |
| `apps/figma-plugin` | Figma frame import and export |
| `apps/notion-embed` | Notion OAuth and embeds |
| `packages/design-tokens` | DTCG tokens, built to CSS and native |
| `packages/ui`, `packages/ui-native` | Shared React and React Native components |
| `packages/*-core` | Shared domain libraries (editor, redaction, cloud, collab, sync, team, and more) |
| `packages/sdk` | Official REST API client |
| `packages/i18n` | Translations |
| `packages/biome-config`, `packages/typescript-config` | Shared tooling config |

## Getting started

Requires [mise](https://mise.jdx.dev/). It installs Node 24, pnpm 9 and stable Rust. Without mise: Node 24 or later, pnpm 9, Rust stable.

```bash
mise trust
mise install
mise run install
mise run install-hooks
mise run tokens:build       # once, before the first dev run
mise run dev:desktop        # or dev:web, dev:mobile, dev:api
```

Use `pnpm`, not `npm` or `yarn`. Add new apps as `dev:*` mise tasks.

## Commands

| Command | What it does |
|---------|--------------|
| `mise run dev:desktop` | Tauri dev app |
| `mise run dev:web` | Landing page on port 3000 |
| `mise run dev:api` | Fastify API with Postgres, Redis and MinIO on port 8787 |
| `mise run dev:mobile` | Expo dev client (Metro) |
| `mise run dev:mobile:ios` / `dev:mobile:android` | Build and run on a simulator or emulator |
| `mise run storybook` | UI component library on port 6006 |
| `mise run tokens:build` | Build design token CSS |
| `mise run lint` | Biome check |
| `mise run typecheck` | TypeScript |
| `mise run test` | Vitest unit tests |
| `mise run test:e2e:native` | Native integration tests |
| `mise run format` | Biome write |
| `mise run build:desktop:{arm64,intel,mac,windows}` | Release builds, on the matching OS |

Rust tests: `cd apps/desktop/src-tauri && cargo test`. Release builds, CI releases and mobile dev builds: [`docs/guides/desktop-builds.md`](docs/guides/desktop-builds.md).

## Documentation

Start at [`docs/README.md`](docs/README.md).

- Architecture: [desktop stack](docs/architecture/desktop-stack.md), [ADR index](docs/architecture/adr/README.md)
- Guides: [release signing](docs/guides/release-signing.md), [mobile signing](docs/guides/release-signing-mobile.md), [Auth0 setup](docs/guides/auth0-setup.md)
- Quality: [accessibility audit](docs/quality/accessibility-audit.md)
- Visual system: [`design.md`](design.md)
- API: [`apps/api/README.md`](apps/api/README.md)
- Agents and contributors: [`AGENTS.md`](AGENTS.md). Commits follow Conventional Commits, enforced by the mise hooks.

## License

The product is licensed under the [GNU AGPL v3](LICENSE): `apps/desktop`, `apps/api`, `apps/web`, `apps/mobile` and the packages they are built from.

Code meant to be embedded in other projects is [MIT](packages/sdk/LICENSE). Each of these directories has its own `LICENSE` file:

- `packages/sdk`, `packages/api-core`, `packages/collab-core`, `packages/editor-core`, `packages/plugin-core`
- `apps/vscode-extension`, `apps/figma-plugin`, `apps/notion-embed`
- `packages/biome-config`, `packages/typescript-config`

The SnapGlow name and logo are not covered by these licenses: see [TRADEMARKS.md](TRADEMARKS.md). Contributions require the [CLA](CLA.md), see [CONTRIBUTING.md](CONTRIBUTING.md).
