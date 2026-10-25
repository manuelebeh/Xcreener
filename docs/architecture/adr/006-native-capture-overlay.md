# ADR-006 - Native capture overlay and preview crop

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 1.1

## Context

Phase 1 requires region, window, and fullscreen capture on macOS and Windows. Users expect a frozen preview while selecting, no flash or second native capture during confirm, and WYSIWYG output matching what they saw when the overlay opened.

Sprint 0 delivered tray + global shortcut → `capture-triggered` with stub UI. Sprint 1.1 implements the real capture flow.

## Decision

### Snapshot-before-overlay (Rust)

1. On shortcut / `show_capture_overlay`, Rust calls `capture_desktop_preview()` **before** showing Xcreener windows.
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
- Future flows that need a fresh native grab (e.g. delayed capture) — see **ADR-007** (Sprint 2b.3)

The overlay confirm path does **not** call them in Sprint 1.1.

### IPC surface

**Commands** (see ADR-003): `show_capture_overlay`, `hide_capture_overlay`, `cancel_capture_overlay`, `list_monitors_command`, `list_windows_command`, `get_window_at_point_command`, `get_capture_overlay_bounds`, plus `capture_*`.

**Events:**

| Event | Direction | Payload | Role |
|-------|-----------|---------|------|
| `capture-overlay-init` | Rust → overlay webview | `CaptureOverlayInitPayload` | Bounds, monitors, preview PNG |
| `capture-image` | Overlay → main webview | `{ bytes, width, height }` | Hand off to editor |
| `capture-error` | Overlay → main webview | `{ message }` | User-visible failure |

Main window listens via `useCaptureSession` → `setScreenshot` → navigate home. **Sprint 1.2:** editor applies default beautification (gradient, auto-padding, radius, shadow) and renders composed preview via Canvas 2D engine (`modules/editor/engine/`).

### Coordinates

- Overlay uses CSS / logical pixels aligned with preview dimensions.
- IPC `i32` args: round in `commands.ts` before `invoke` (HiDPI / subpixel `clientX`).
- Screen → overlay-local rects: `toOverlayRect(screenRect, bounds)`.

### macOS specifics

`overlay_macos.rs` configures overlay window level / transparency. Screen Recording permission required for `xcap` preview.

### Windows specifics

`overlay_windows.rs` keeps WebView2 at 1:1 zoom (`set_zoom(1.0)`) so HiDPI scaling does not inflate `innerWidth` and push fixed UI (toolbar) off-screen. Layout is re-applied when display scale or bounds change between capture sessions.

Frontend: `overlayCoordinates.ts` and `captureToolbarPlacement.ts` resolve Windows display scale when `xcap` reports 1.0 while DPI is > 100% (Vitest coverage in `overlayCoordinates.test.ts`, `captureToolbarPlacement.test.ts`).

Capture preview, monitor/window listing, and the three overlay modes use `xcap` cross-platform (P1-002, P1-004, P1-005). Manual QA validated region, window, and fullscreen on Windows (2026-06-20).

## Consequences

- Preview is a point-in-time snapshot; content changing after overlay open is not reflected until a new capture session.
- Region, window, and fullscreen capture validated on macOS and Windows via manual QA (macOS 2026-06-16, Windows 2026-06-20).
- Multi-monitor / HiDPI: macOS validated on at least two configurations (2026-06-16); Windows overlay scale and toolbar placement validated in manual QA (2026-06-20). Automated CI matrix on macOS remains limited ([ADR-004](./004-system-integration-tray-shortcuts.md)).

## References

- [ADR-003](./003-desktop-ipc-and-events.md)
- [ADR-004](./004-system-integration-tray-shortcuts.md)
- Sprints & Implementations - Sprint 1.1 (private, `docs/internal/`)
- Sprints & Implementations - Sprint 1.2 (private, `docs/internal/`)
