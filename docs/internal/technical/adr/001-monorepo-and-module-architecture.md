# ADR-001 — Monorepo orchestration & desktop module architecture

**Status:** Accepted  
**Date:** 2026-06-15  
**Sprint:** 0.1

## Context

SnapGlow evolves from a desktop menu-bar app (Tauri) toward a multi-surface product: web landing (TanStack Start, VPS), mobile (Expo), and API (Fastify). Sprint 0.1 establishes the monorepo skeleton, shared tooling, and a modular desktop frontend without implementing capture/editor features yet.

## Decision

### Monorepo layout

```
screen-cut/
├── apps/desktop/     # Tauri v2 + React (Sprint 0.1)
├── apps/web/         # TanStack Start landing, VPS (Sprint 0.2)
├── apps/mobile/      # Expo (Phase 1b)
├── apps/api/         # Fastify (Phase 2b)
└── packages/         # Shared config & future design-tokens, i18n
```

### Orchestration layers

| Layer | Tool | Role |
|-------|------|------|
| Toolchains | **mise** | Node 24, pnpm 9, Rust stable |
| Dev entry | **mise.toml tasks** | `dev:desktop`, `lint`, `typecheck`, `install` |
| TS cache | **Turborepo** | `build`, `lint`, `typecheck`, `format` across workspaces |
| Git hooks | **mise** (`pre-commit`, `commit-msg`, P0-025) | Pre-commit Biome; Conventional Commits |

**Not adopted from fullstack-starter:** Flutter, FastAPI, GCP Terraform, oh-my-agent, Serena MCP.

### Desktop frontend modules

Feature boundaries live under `apps/desktop/src/modules/`:

- **capture** — screen capture orchestration (Zustand store + hooks)
- **editor** — canvas / beautify UI
- **export** — format helpers and export flow
- **settings** — user preferences UI

Cross-cutting:

- `src/app/` — routing, providers, shell
- `src/shared/types/` — shared TS types (IPC payloads, settings)
- `src/tauri/` — typed wrappers for `invoke` and event listeners
- `src/db/` — SQLite via `@tauri-apps/plugin-sql` (local-first, no cloud sync in MVP)

Modules expose a public API through `index.ts`; internal files stay colocated (`store.ts`, `components/`, `hooks/`).

### Rust command surface

Tauri commands are grouped in `src-tauri/src/commands/` (`capture`, `export`, `storage`). **Sprint 1.1** implements native capture (`src-tauri/src/capture/`, overlay window, preview snapshot — ADR-006). **Sprint 1.2** implements the beautification engine in `modules/editor/engine/` (Canvas 2D, frontend-only — no new Rust commands). **Export** remains a stub until Sprint 1.5. **Sprint 0.3** adds system integration in `src-tauri/src/tray.rs` and `shortcuts.rs` (tray icon, global shortcut → overlay, autostart plugin). Settings persistence uses the **frontend SQL plugin** via `src/db/`; Rust `get_setting` / `set_setting` remain placeholders until a shared Rust-side store is needed.

### Code intelligence

- **CodeGraph** for structural navigation (TS + Rust)
- **Hallmark** skill for UI polish reviews
- Prefer CodeGraph over blind grep for cross-module refactors

### Related ADRs

- [ADR-002](./002-design-tokens-ui-and-web.md) — design tokens and shared UI
- [ADR-003](./003-desktop-ipc-and-events.md) — IPC commands and events
- [ADR-004](./004-system-integration-tray-shortcuts.md) — tray, shortcuts, autostart
- [ADR-005](./005-distribution-updates-and-signing.md) — updater and release pipeline
- [ADR-006](./006-native-capture-overlay.md) — native capture overlay (Sprint 1.1)

## Consequences

- New apps add a `dev:*` task in `mise.toml` and a Turbo pipeline entry; no root script sprawl.
- Husky was temporary (Sprint 0.1); replaced by mise git hooks in Sprint 0.2 (see ADR-002).
- Module imports use `@/modules/<name>` or package `index.ts` — avoid deep relative paths across module boundaries.

## References

- [Technical Stack - Desktop.md](../Technical%20Stack%20-%20Desktop.md)
- [Sprints & Implementations.md](../../product/Sprints%20%26%20Implementations.md)
