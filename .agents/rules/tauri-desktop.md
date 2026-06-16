# Tauri desktop

## App identity

- Identifier: `app.snapglow.desktop`
- Product: SnapGlow
- Crate: `snapglow-desktop` in `apps/desktop/src-tauri/`

## Window (Sprint 0.1 skeleton)

Menu-bar style: 480×640, native decorations on `main`, frameless `capture-overlay`, initially hidden (`visible: false`).

## Commands

Rust modules in `src-tauri/src/commands/`:

- `capture` — region/window/fullscreen, overlay (Sprint 1.1)
- `redaction` — `detect_sensitive_data` : OCR + regex detectors (Sprint 1.5)
- `export` — `export_image` stub (unused; export is frontend offscreen canvas + dialog/fs)
- `storage` — settings IPC placeholders; frontend uses SQL plugin directly

Redaction engine: `src-tauri/src/redaction/` (Vision macOS, Windows.Media.Ocr).

Register new commands in `lib.rs` and mirror types in `src/shared/types/ipc.ts` + `src/tauri/commands.ts`.

## SQLite

- Plugin: `tauri-plugin-sql`, preloaded DB `sqlite:snapglow.db`
- Migrations: `src/db/migrations/*.sql`, applied via `migrate.ts` (`ensureMigrationsApplied`)
- Capture history: `src/db/captures.ts` (retention 30, frontend-only)
- Capability: `sql:default` + `sql:allow-execute` in `capabilities/default.json`

## Tauri features & security

- Cargo feature `image-png` on `tauri` — required for clipboard image copy (`Image.fromBytes`)
- Asset protocol enabled in `tauri.conf.json` — history thumbnails via `convertFileSrc`
- FS scope: `fs:scope-appdata-recursive` for `$APPDATA/**` (captures, thumbnails)
- Clipboard: `clipboard-manager:allow-write-image`

CSP in `tauri.conf.json` — keep `'unsafe-inline'` for styles only as needed; no remote scripts.
