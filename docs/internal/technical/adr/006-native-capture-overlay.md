# ADR-006 — Native capture overlay and preview crop

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 1.1

## Context

Phase 1 requires region, window, and fullscreen capture on macOS and Windows. Users expect a frozen preview while selecting, no flash or second native capture during confirm, and WYSIWYG output matching what they saw when the overlay opened.

Sprint 0 delivered tray + global shortcut → `capture-triggered` with stub UI. Sprint 1.1 implements the real capture flow.

## Decision

### Snapshot-before-overlay (Rust)

1. On shortcut / `show_capture_overlay`, Rust calls `capture_desktop_preview()` **before** showing SnapGlow windows.
2. Preview is a PNG compositing all monitors into overlay bounds (`get_overlay_bounds`).
3. Rust positions the `capture-overlay` webview and emits `capture-overlay-init` with `{ bounds, monitors, previewPng }`.

Implementation: `src-tauri/src/overlay.rs`, `src-tauri/src/capture/mod.rs` (`xcap`).

### Overlay UI (React)

Dedicated route in `capture-overlay` window (`CaptureOverlayRoot` → `CaptureOverlay`).

| Mode | Interaction | Confirm output |
|------|-------------|----------------|
| **Region** | Drag selection → **Capture** / Enter | Crop preview to selection rect (overlay-local coords) |
| **Window** | Hover highlight → click window | Crop preview to window bounds |
| **Screen** | Hover monitor highlight → click or **Capture** / Enter | Crop preview to monitor bounds |

- Mode toolbar switches do **not** trigger capture (click propagation stopped on toolbar).
- Region does **not** auto-capture on pointer up.
- No « Capturing… » overlay: confirm path uses client-side canvas crop (`cropObjectUrlToPngBytes`), not a second native `capture_*` invoke.

### Native capture commands (Rust)

`capture_region`, `capture_window`, `capture_fullscreen` remain implemented and registered for:

- Unit/integration tests
- Future flows that need a fresh native grab (e.g. delayed capture)

The overlay confirm path does **not** call them in Sprint 1.1.

### IPC surface

**Commands** (see ADR-003): `show_capture_overlay`, `hide_capture_overlay`, `cancel_capture_overlay`, `list_monitors_command`, `list_windows_command`, `get_window_at_point_command`, `get_capture_overlay_bounds`, plus `capture_*`.

**Events:**

| Event | Direction | Payload | Role |
|-------|-----------|---------|------|
| `capture-overlay-init` | Rust → overlay webview | `CaptureOverlayInitPayload` | Bounds, monitors, preview PNG |
| `capture-image` | Overlay → main webview | `{ bytes, width, height }` | Hand off to editor |
| `capture-error` | Overlay → main webview | `{ message }` | User-visible failure |

Main window listens via `useCaptureSession` → `setScreenshot` → navigate home.

### Coordinates

- Overlay uses CSS / logical pixels aligned with preview dimensions.
- IPC `i32` args: round in `commands.ts` before `invoke` (HiDPI / subpixel `clientX`).
- Screen → overlay-local rects: `toOverlayRect(screenRect, bounds)`.

### macOS specifics

`overlay_macos.rs` configures overlay window level / transparency. Screen Recording permission required for `xcap` preview.

## Consequences

- Preview is a point-in-time snapshot; content changing after overlay open is not reflected until a new capture session.
- Windows parity relies on `xcap`; dedicated Graphics Capture API work tracked as P1-002 / P1-004 if gaps appear.
- Multi-monitor / HiDPI validated on macOS via manual QA (2026-06-16); automated CI matrix on macOS remains limited ([ADR-004](./004-system-integration-tray-shortcuts.md)).

## References

- [ADR-003](./003-desktop-ipc-and-events.md)
- [ADR-004](./004-system-integration-tray-shortcuts.md)
- [Sprints & Implementations — Sprint 1.1](../../product/Sprints%20%26%20Implementations.md)
