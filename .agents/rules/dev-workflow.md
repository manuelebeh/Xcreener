# Dev workflow

## Setup

```bash
mise trust && mise install && mise run install && mise run install-hooks
mise run tokens:build
```

Requires: mise (recommended), or manual Node 24+ + pnpm 9 + Rust stable.

## Daily commands

| Task | Command |
|------|---------|
| Desktop dev | `mise run dev:desktop` |
| Web landing dev | `mise run dev:web` |
| Storybook | `mise run storybook` |
| Build tokens | `mise run tokens:build` |
| Lint | `mise run lint` |
| Typecheck | `mise run typecheck` |
| Format | `mise run format` |
| Rust check | `cd apps/desktop/src-tauri && cargo check` |

Turbo caches JS tasks; mise is the single entry point for humans and agents.

## Git hooks

**mise** (Sprint 0.2+): `pre-commit` runs lint-staged (Biome); `commit-msg` runs commitlint.

After clone or if hooks are missing: `mise run install-hooks`

## Adding an app

1. Scaffold under `apps/<name>/`
2. Add workspace to `pnpm-workspace.yaml`
3. Add `dev:<name>` task in `mise.toml`
4. Ensure package has `lint`, `typecheck`, `build` scripts for Turbo
