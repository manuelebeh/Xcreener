# Tauri desktop

## App identity

- Identifier: `app.snapglow.desktop`
- Product: SnapGlow
- Crate: `snapglow-desktop` in `apps/desktop/src-tauri/`

## Window (Sprint 0.1 skeleton)

Menu-bar style: 480×640, no decorations, transparent, initially hidden (`visible: false`).

## Commands

Rust modules in `src-tauri/src/commands/`:

- `capture` — region/window/fullscreen (stubs in 0.1)
- `export` — image export (stub)
- `storage` — settings IPC placeholders; frontend uses SQL plugin directly in 0.1

Register new commands in `lib.rs` and mirror types in `src/shared/types/ipc.ts` + `src/tauri/commands.ts`.

## SQLite

- Plugin: `tauri-plugin-sql`, preloaded DB `sqlite:snapglow.db`
- Migrations: `src/db/migrations/*.sql`, applied in `initDatabase()`
- Capability: `sql:default` in `capabilities/default.json`

## Security

CSP in `tauri.conf.json` — keep `'unsafe-inline'` for styles only as needed; no remote scripts.
