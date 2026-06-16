# ADR-003 — Desktop IPC commands and events

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.4

## Context

SnapGlow desktop splits UI (React) from platform integration (Rust/Tauri). Phase 0 scaffolds capture/export commands as stubs while real settings persistence lives in the frontend SQL layer. **Sprint 1.1** implements native capture (overlay, preview snapshot, editor handoff). **Sprint 1.2** implements beautification in the editor module (Canvas 2D engine, no new IPC). See [ADR-006](./006-native-capture-overlay.md).

## Decision

### Invoke commands (Rust → frontend)

Typed wrappers live in `apps/desktop/src/tauri/commands.ts`. All `invoke` calls go through this module — no raw string literals in feature code.

| Command | Rust module | Status | Payload |
|---------|-------------|--------|---------|
| `capture_region` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ x, y, width, height }` → `number[]` |
| `capture_window` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ windowId }` → `number[]` |
| `capture_fullscreen` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ displayId }` → `number[]` |
| `list_monitors_command` | `commands/capture.rs` | Live | `()` → `MonitorInfo[]` |
| `list_windows_command` | `commands/capture.rs` | Live | `()` → `WindowInfo[]` |
| `get_window_at_point_command` | `commands/capture.rs` | Live | `{ x, y }` → `WindowInfo \| null` |
| `show_capture_overlay` | `commands/capture.rs` | Live | `()` → `CaptureOverlayBounds` |
| `hide_capture_overlay` | `commands/capture.rs` | Live | `()` |
| `cancel_capture_overlay` | `commands/capture.rs` | Live | `()` |
| `get_capture_overlay_bounds` | `commands/capture.rs` | Live | `()` → `CaptureOverlayBounds` |
| `export_image` | `commands/export.rs` | Stub | `{ imageData, format, quality, path }` |
| `get_setting` / `set_setting` | `commands/storage.rs` | Placeholder | Prefer `@/db` on frontend |
| `update_capture_shortcut` | `shortcuts.rs` | Live | `{ shortcut }` — Tauri global-shortcut format |

Handler registration: `lib.rs` → `invoke_handler!`.

### Events (Rust → frontend, push)

Listeners use `apps/desktop/src/tauri/events.ts` → `onAppEvent`.

| Event | Emitter | Payload | Consumer |
|-------|---------|---------|----------|
| `capture-overlay-init` | `overlay.rs` | `CaptureOverlayInitPayload` | `CaptureOverlayRoot` |
| `capture-image` | `CaptureOverlay` (emit) | `CaptureImagePayload` | `useCaptureSession` → editor |
| `capture-error` | `CaptureOverlay` (emit) | `CaptureErrorPayload` | `useCaptureSession` |
| `navigate-settings` | Tray menu | `()` | `useTrayNavigation` |

> Le raccourci global et `e2e_emit_capture_triggered` appellent `show_capture_overlay` directement (pas d'event intermédiaire).

### Settings persistence

**Phase 0:** SQLite via `@tauri-apps/plugin-sql` in `apps/desktop/src/db/`. Rust `get_setting` / `set_setting` remain placeholders until a shared Rust-side store is required (e.g. autostart read at boot without webview).

### Validation

- Shortcut strings validated in TS (`shared/lib/shortcut.ts`) before `invoke`.
- Rust `update_capture_shortcut` returns `Result<(), String>` — errors surface in Settings UI.
- Capture IPC coordinates rounded to integers in `commands.ts` before `invoke` (HiDPI subpixels).
- Capture bounds validated in Rust (`capture/validate.rs`) for native `capture_*` commands.

## Consequences

- New commands: add Rust handler in `commands/`, register in `lib.rs`, wrap in `commands.ts`, type payloads in `shared/types/ipc.ts`.
- Prefer events for fire-and-forget signals; use `invoke` when the frontend needs a return value or error handling.
- Debug-only commands (`emit_test_capture_triggered`) gated with `#[cfg(debug_assertions)]`.

## References

- [ADR-001](./001-monorepo-and-module-architecture.md)
- [ADR-004](./004-system-integration-tray-shortcuts.md)
- [ADR-006](./006-native-capture-overlay.md)
- [Technical Stack - Desktop.md](../Technical%20Stack%20-%20Desktop.md)
