# ADR-003 — Desktop IPC commands and events

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.4

## Context

SnapGlow desktop splits UI (React) from platform integration (Rust/Tauri). Phase 0 scaffolds capture/export commands as stubs while real settings persistence lives in the frontend SQL layer. We need a stable contract before Phase 1 implements native capture.

## Decision

### Invoke commands (Rust → frontend)

Typed wrappers live in `apps/desktop/src/tauri/commands.ts`. All `invoke` calls go through this module — no raw string literals in feature code.

| Command | Rust module | Phase 0 status | Payload |
|---------|-------------|----------------|---------|
| `capture_region` | `commands/capture.rs` | Stub | `{ x, y, width, height }` → `number[]` |
| `capture_window` | `commands/capture.rs` | Stub | `{ windowId }` → `number[]` |
| `capture_fullscreen` | `commands/capture.rs` | Stub | `{ displayId }` → `number[]` |
| `export_image` | `commands/export.rs` | Stub | `{ imageData, format, quality, path }` |
| `get_setting` / `set_setting` | `commands/storage.rs` | Placeholder | Prefer `@/db` on frontend |
| `update_capture_shortcut` | `shortcuts.rs` | Live | `{ shortcut }` — Tauri global-shortcut format |

Handler registration: `lib.rs` → `invoke_handler!`.

### Events (Rust → frontend, push)

Listeners use `apps/desktop/src/tauri/events.ts` → `onAppEvent`.

| Event | Emitter | Payload | Consumer |
|-------|---------|---------|----------|
| `capture-triggered` | Global shortcut handler, debug test hook | `{ source: "shortcut" \| "test" }` | `useGlobalShortcut`, capture module |
| `navigate-settings` | Tray menu | `()` | `useTrayNavigation` |

### Settings persistence

**Phase 0:** SQLite via `@tauri-apps/plugin-sql` in `apps/desktop/src/db/`. Rust `get_setting` / `set_setting` remain placeholders until a shared Rust-side store is required (e.g. autostart read at boot without webview).

### Validation

- Shortcut strings validated in TS (`shared/lib/shortcut.ts`) before `invoke`.
- Rust `update_capture_shortcut` returns `Result<(), String>` — errors surface in Settings UI.
- Phase 1 capture commands will validate bounds (positive dimensions, display IDs) before native APIs.

## Consequences

- New commands: add Rust handler in `commands/`, register in `lib.rs`, wrap in `commands.ts`, type payloads in `shared/types/ipc.ts`.
- Prefer events for fire-and-forget signals; use `invoke` when the frontend needs a return value or error handling.
- Debug-only commands (`emit_test_capture_triggered`) gated with `#[cfg(debug_assertions)]`.

## References

- [ADR-001](./001-monorepo-and-module-architecture.md)
- [ADR-004](./004-system-integration-tray-shortcuts.md)
- [Technical Stack - Desktop.md](../Technical%20Stack%20-%20Desktop.md)
