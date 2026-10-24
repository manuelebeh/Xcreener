# ADR-003 - Desktop IPC commands and events

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.4

## Context

SnapGlow desktop splits UI (React) from platform integration (Rust/Tauri). Phase 0 scaffolds capture/export commands as stubs while real settings persistence lives in the frontend SQL layer. **Sprint 1.1** implements native capture (overlay, preview snapshot, editor handoff). **Sprint 1.2** implements beautification in the editor module (Canvas 2D engine, no new IPC). **Sprint 1.5** adds `detect_sensitive_data` (OCR + regex redaction) and frontend-only file export (dialog + fs + clipboard). **Sprint 1.6** adds capture history (frontend `db/captures.ts` + filesystem, no Rust IPC) and debug-only E2E hooks in `test_support.rs`. **Sprint 2b.1** adds `classify_content_command`. **Sprint 2b.2** adds OCR copy-text, auto-crop, and smart export compression IPC. **Sprint 2b.3** adds live capture flows (delay, menu, scroll) — see [ADR-007](./007-live-capture-flows.md). See also [ADR-006](./006-native-capture-overlay.md).

## Decision

### Invoke commands (Rust → frontend)

Typed wrappers live in `apps/desktop/src/tauri/commands.ts`. All `invoke` calls go through this module - no raw string literals in feature code.

| Command | Rust module | Status | Payload |
|---------|-------------|--------|---------|
| `capture_region` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ x, y, width, height }` → `number[]` |
| `capture_window` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ windowId }` → `number[]` |
| `capture_fullscreen` | `commands/capture.rs` | Live (native; overlay uses preview crop) | `{ displayId }` → `number[]` |
| `list_monitors_command` | `commands/capture.rs` | Live | `()` → `MonitorInfo[]` |
| `list_windows_command` | `commands/capture.rs` | Live | `()` → `WindowInfo[]` |
| `get_window_at_point_command` | `commands/capture.rs` | Live | `{ x, y }` → `WindowInfo \| null` |
| `show_capture_overlay` | `commands/capture.rs` | Live | `()` → `CaptureOverlayBounds` |
| `show_live_capture_overlay` | `commands/capture.rs` | Live (Sprint 2b.3) | `()` → `CaptureOverlayBounds` — overlay sans preview (menu) |
| `capture_overlay_ready` | `commands/capture.rs` | Live | `()` — présente l'overlay après init geometry |
| `get_overlay_webview_layout` | `commands/overlay_layout.rs` | Live | `()` → `OverlayWebviewLayout` |
| `capture_native_command` | `commands/capture.rs` | Live (Sprint 2b.3) | `{ request: CaptureNativeRequest }` → `number[]` — delay / menu / native grab |
| `capture_scrolling_window_command` | `commands/capture.rs` | Live (Sprint 2b.3) | `{ window: WindowInfo }` → `number[]` — scroll Home + Page Down + stitch |
| `stop_scrolling_capture_command` | `commands/capture.rs` | Live (Sprint 2b.3) | `()` — fin anticipée scroll (Done ; assemble frames acquises) |
| `cancel_live_capture_command` | `commands/capture.rs` | Live (Sprint 2b.3) | `()` — annule countdown / capture live en cours |
| `hide_capture_overlay` | `commands/capture.rs` | Live | `()` |
| `cancel_capture_overlay` | `commands/capture.rs` | Live | `()` |
| `get_capture_overlay_bounds` | `commands/capture.rs` | Live | `()` → `CaptureOverlayBounds` |
| `detect_sensitive_data` | `commands/redaction.rs` | Live | `imageData: number[]` → `SensitiveRegion[]` |
| `recognize_text_command` | `commands/ocr.rs` | Live (Sprint 2b.2) | `{ imageData, options }` → `TextLine[]` (copy-text OCR; shared engine in `src-tauri/src/ocr/`) |
| `analyze_content_command` | `commands/image_processing.rs` | Live (replaces `detect_content_bounds_command` + `crop_image_command`) | `imageData: number[]` → `ContentAnalysis` (`bounds`, RGBA `background`) |
| `compress_export_bytes_command` | `commands/image_processing.rs` | Live (Sprint 2b.2) | `{ imageData, format, quality }` → `number[]` — optional post-pass after frontend canvas render |
| `classify_content_command` | `commands/classification.rs` | Live (Sprint 2b.1) | `imageData: number[]` → `ClassificationResult` |
| `export_image` | `commands/export.rs` | Live (path write helper) | `{ imageData, format, quality, path }` — compresses then writes file; primary export UI still uses frontend render + `compress_export_bytes_command` |
| `get_setting` / `set_setting` | `commands/storage.rs` | Placeholder | Prefer `@/db` on frontend |
| `update_capture_shortcut` | `shortcuts.rs` | Live | `{ shortcut }` - Tauri global-shortcut format |

**Debug-only (E2E, `#[cfg(debug_assertions)]`)** - registered in `test_support.rs`:

| Command | Purpose |
|---------|---------|
| `e2e_show_main_window` / `e2e_hide_main_window` | Window visibility for WebDriver |
| `e2e_emit_capture_triggered` | Simulate global shortcut |
| `e2e_inject_screenshot` | Inject PNG bytes → editor via `capture-image` event |
| `e2e_temp_export_path` / `e2e_file_metadata` | Export path assertions |
| `e2e_is_main_window_visible` / `e2e_is_capture_overlay_visible` | Visibility checks |

Handler registration: `lib.rs` → `invoke_handler!`.

### Events (Rust → frontend, push)

Listeners use `apps/desktop/src/tauri/events.ts` → `onAppEvent`.

| Event | Emitter | Payload | Consumer |
|-------|---------|---------|----------|
| `capture-overlay-init` | `overlay.rs` | `CaptureOverlayInitPayload` | `CaptureOverlayRoot` |
| `capture-overlay-presented` | `overlay.rs` | `OverlayWebviewLayout` | `CaptureOverlayRoot` |
| `capture-overlay-progress-hud` | `overlay.rs` | `()` | `CaptureOverlay` — mode HUD scroll (pastille flottante) |
| `capture-progress` | `capture/native.rs`, `capture/scroll.rs`, overlay (emit) | `CaptureProgressPayload` | `CaptureOverlay`, `useCaptureSession` (countdown main app uniquement) |
| `capture-image` | `CaptureOverlay` (emit) | `CaptureImagePayload` | `useCaptureSession` → editor |
| `capture-error` | `CaptureOverlay` (emit) | `CaptureErrorPayload` | `useCaptureSession` |
| `navigate-settings` | Tray menu | `()` | `useTrayNavigation` |

> Le raccourci global et `e2e_emit_capture_triggered` appellent `show_capture_overlay` directement (pas d'event intermédiaire).

### Settings persistence

**Phase 0:** SQLite via `@tauri-apps/plugin-sql` in `apps/desktop/src/db/`. Migrations in `migrations/001_init.sql`; `migrate.ts` applies statements one-by-one (`sql:allow-execute`). Rust `get_setting` / `set_setting` remain placeholders until a shared Rust-side store is required (e.g. autostart read at boot without webview).

**2026-10 (audit FINDING-011):** the SQL plugin is gone. Rust opens `snapglow.db` with rusqlite (`src-tauri/src/db/`), applies the same `migrations/*.sql` in `db_init`, and exposes one typed command per query. `src/db/*.ts` keep their API and call those commands, so the WebView can no longer run arbitrary SQL.

### Capture history (Sprint 1.6)

Frontend-only - no Rust IPC:

- **SQLite:** `db/captures.ts` - insert/list/prune/delete on `captures` table (retention 30)
- **Filesystem:** `$APPDATA/captures/YYYY-MM/capture_*.png` + `$APPDATA/thumbnails/thumb_*.webp`
- **Hook:** `useCaptureSession` → `persistCapture` (sequential queue after capture)
- **Thumbnails:** `convertFileSrc` via Tauri asset protocol (`assetProtocol.enable` in `tauri.conf.json`)

### Validation

- Shortcut strings validated in TS (`shared/lib/shortcut.ts`) before `invoke`.
- Rust `update_capture_shortcut` returns `Result<(), String>` - errors surface in Settings UI.
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
- [ADR-007](./007-live-capture-flows.md)
- [Technical Stack - Desktop.md](../desktop-stack.md)
