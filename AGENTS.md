# SnapGlow — Agent guide

Privacy-first screenshot app. Monorepo: **Tauri desktop** (now) → **Astro web** → **Expo mobile** → **Fastify API**.

## Stack

| Area | Choice |
|------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Dev CLI | [mise](https://mise.jdx.dev/) — `mise run dev:desktop`, `lint`, `typecheck` |
| Desktop | Tauri v2, React 19, Vite, TypeScript |
| Lint / format | Biome (not ESLint/Prettier) |
| State | Zustand per module |
| Local DB | `@tauri-apps/plugin-sql` (SQLite) |
| Commits | Conventional Commits; Husky pre-commit (→ mise hooks Sprint 0.2) |

## Repo map

```
apps/desktop/     Tauri app (@snapglow/desktop)
packages/         biome-config, typescript-config
docs/internal/    Product & technical specs
.agents/rules/    Workflow rules for agents
```

## Commands

```bash
mise trust && mise install && mise run install
mise run dev:desktop    # Tauri dev
mise run lint
mise run typecheck
```

Rust checks: `cd apps/desktop/src-tauri && cargo check`

## Architecture

- **Modules:** `apps/desktop/src/modules/{capture,editor,export,settings}/`
- **ADR-001:** `docs/internal/technical/adr/001-monorepo-and-module-architecture.md`
- Invoke Rust via `src/tauri/commands.ts`; prefer `@/db` for SQLite in Sprint 0.1

## Agent conventions

1. **CodeGraph > grep** for exploring structure across TS and Rust.
2. **Hallmark** (`.cursor/skills/hallmark/`) for UI/UX polish on frontend work.
3. **Privacy-first:** no telemetry, no cloud upload without explicit user action.
4. **Minimal diffs:** match existing patterns; don't add ESLint/Prettier.
5. **mise** is the dev entry point — add new apps as `dev:*` tasks, not ad-hoc root scripts.

## Multi-app roadmap

| Phase | App | mise task |
|-------|-----|-----------|
| 0.1 | desktop | `dev:desktop` |
| 0.2 | web (Astro) | `dev:web` |
| 1b | mobile (Expo) | `dev:mobile` |
| 2b | api (Fastify) | `dev:api` |

Rules for future surfaces: `.agents/rules/mobile.md`, `api.md` (Phase 1b / 2b).
