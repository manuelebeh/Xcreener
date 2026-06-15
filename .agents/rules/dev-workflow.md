# Dev workflow

## Setup

```bash
mise trust && mise install && mise run install
```

Requires: mise (recommended), or manual Node 24+ + pnpm 9 + Rust stable.

## Daily commands

| Task | Command |
|------|---------|
| Desktop dev | `mise run dev:desktop` |
| Lint | `mise run lint` |
| Typecheck | `mise run typecheck` |
| Format | `mise run format` |
| Rust check | `cd apps/desktop/src-tauri && cargo check` |

Turbo caches JS tasks; mise is the single entry point for humans and agents.

## Git hooks

Sprint 0.1: Husky (pre-commit Biome, commit-msg commitlint).  
Sprint 0.2 (P0-025): migrate to mise git hooks when `apps/web` exists.

## Adding an app

1. Scaffold under `apps/<name>/`
2. Add workspace to `pnpm-workspace.yaml`
3. Add `dev:<name>` task in `mise.toml`
4. Ensure package has `lint`, `typecheck`, `build` scripts for Turbo
