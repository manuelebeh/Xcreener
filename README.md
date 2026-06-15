# SnapGlow

Privacy-first screenshot app — capture, beautify, and share without the cloud.

## Monorepo

| Path | Description |
|------|-------------|
| `apps/desktop` | Tauri v2 + React (menu-bar desktop app) |
| `packages/biome-config` | Shared Biome lint/format config |
| `packages/typescript-config` | Shared TypeScript configs |

Future: `apps/web` (Astro), `apps/mobile` (Expo), `apps/api` (Fastify).

## Prerequisites

- [mise](https://mise.jdx.dev/) (recommended) — installs Node 24, pnpm 9, Rust stable
- Or manually: Node ≥ 24, pnpm 9, Rust stable

## Quick start

```bash
mise trust
mise install
mise run install
mise run dev:desktop
```

## Scripts (via mise)

| Command | Description |
|---------|-------------|
| `mise run dev:desktop` | Start Tauri dev server |
| `mise run lint` | Biome check (Turbo) |
| `mise run typecheck` | TypeScript (Turbo) |
| `mise run format` | Biome write (Turbo) |

Rust: `cd apps/desktop/src-tauri && cargo check`

## Architecture

- Module layout: `apps/desktop/src/modules/{capture,editor,export,settings}/`
- ADR: [`docs/internal/technical/adr/001-monorepo-and-module-architecture.md`](docs/internal/technical/adr/001-monorepo-and-module-architecture.md)
- Agent guide: [`AGENTS.md`](AGENTS.md)

## License

Private — see repository owner.
