# SnapGlow

Privacy-first screenshot app — capture, beautify, and share without the cloud.

## Monorepo

| Path | Description |
|------|-------------|
| `apps/desktop` | Tauri v2 + React (menu-bar desktop app) |
| `apps/web` | TanStack Start landing (`@snapglow/web`) |
| `packages/design-tokens` | DTCG design tokens → CSS / Tailwind theme |
| `packages/ui` | Shared React components + Storybook |
| `packages/biome-config` | Shared Biome lint/format config |
| `packages/typescript-config` | Shared TypeScript configs |

Future: `apps/mobile` (Expo), `apps/api` (Fastify).

## Prerequisites

- [mise](https://mise.jdx.dev/) (recommended) — installs Node 24, pnpm 9, Rust stable
- Or manually: Node ≥ 24, pnpm 9, Rust stable

## Quick start

```bash
mise trust
mise install
mise run install
mise run install-hooks
mise run tokens:build
mise run dev:desktop   # or: mise run dev:web
```

## Scripts (via mise)

| Command | Description |
|---------|-------------|
| `mise run dev:desktop` | Start Tauri dev server |
| `mise run dev:web` | Start landing dev server (port 3000) |
| `mise run storybook` | UI component library (port 6006) |
| `mise run tokens:build` | Build design token CSS |
| `mise run lint` | Biome check (Turbo) |
| `mise run typecheck` | TypeScript (Turbo) |
| `mise run test` | Unit tests Vitest (Turbo) |
| `mise run format` | Biome write (Turbo) |

Rust: `cd apps/desktop/src-tauri && cargo check`

Desktop e2e: `pnpm --filter @snapglow/desktop test:e2e` (Playwright smoke ; tray/shortcuts natifs en Sprint 0.4)

## Architecture

- Module layout: `apps/desktop/src/modules/{capture,editor,export,settings}/`
- ADR: [`docs/internal/technical/adr/001-monorepo-and-module-architecture.md`](docs/internal/technical/adr/001-monorepo-and-module-architecture.md)
- ADR: [`docs/internal/technical/adr/002-design-tokens-ui-and-web.md`](docs/internal/technical/adr/002-design-tokens-ui-and-web.md)
- Agent guide: [`AGENTS.md`](AGENTS.md)

## License

Private — see repository owner.
