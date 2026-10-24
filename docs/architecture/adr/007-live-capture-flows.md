# ADR-007 - Live capture flows (delay, menu, scroll)

**Status:** Accepted  
**Date:** 2026-06-20  
**Sprint:** 2b.3

## Context

ADR-006 established snapshot-before-overlay: a frozen PNG preview is cropped client-side on confirm. That model works for static region / window / fullscreen capture but cannot support:

- **Delayed capture** — content changes after the user triggers capture
- **Menu capture** — opening the overlay dismisses context menus
- **Scrolling capture** — multiple frames must be grabbed after programmatic scroll

Native `capture_region`, `capture_window`, and `capture_fullscreen` were kept for future flows (ADR-006).

## Decision

Two coexisting confirm paths:

| Path | When | Output |
|------|------|--------|
| **Preview crop** | Region / Window / Screen, delay Off | Canvas crop from frozen preview (unchanged Sprint 1.1) |
| **Native grab** | Delay > 0, Menu mode, Scroll mode | Rust `capture_*` after overlay hides or enters progress HUD |

### Delayed capture (AC-003)

- Toolbar dropdown: Off / 3s / 5s / 10s
- On confirm with delay > 0: `capture_native_command` runs countdown (emits `capture-progress`), hides overlay, then native grab
- Applies to region, window, and fullscreen targets

### Menu capture (AC-004)

- Toolbar mode **Menu**: live overlay (no preview image; dimmed transparent backdrop)
- Default delay 3s (user-adjustable via Delay dropdown)
- User selects region (drag) or window (click), then confirms
- Native grab after countdown so the user can open a context menu

### Scrolling capture (AC-001 / AC-002)

- Toolbar mode **Scroll**: window selection only; overlay passes full `WindowInfo` to Rust
- `capture_scrolling_window_command` resolves target via `resolve_window` (id + title/bounds; excludes SnapGlow windows)
- **Algorithm** (viewport chunks, same pattern as browser scroll-capture extensions):
  1. Focus target window
  2. Scroll to top (`Home` × 5 + `Cmd+Up` on macOS; `VK_HOME` on Windows)
  3. Settle ~600 ms
  4. Capture first viewport (`capture_xcap_window`)
  5. Loop (max 50 iterations, max stitched height 30 000 px):
     - `Page Down` (`VK_NEXT` / macOS Page Down key via CGEvent)
     - Settle ~550 ms (interruptible when user taps **Done**)
     - Capture viewport
     - Stop if frame unchanged or stitch finds no new content
     - Else `append_scrolled_frame` (overlap detection on bottom/top rows, `capture/stitch.rs`)
- **Progress UI**: overlay shrinks to floating HUD pill (`show_capture_progress_hud`); frame counter; **Done** finishes early with partial stitch (not cancel)
- **Cancel** (`cancel_live_capture_command`): abort live capture (countdown / toolbar Cancel); distinct from Done

### IPC

**Commands:** `capture_native_command`, `capture_scrolling_window_command`, `cancel_live_capture_command`, `stop_scrolling_capture_command`, `show_live_capture_overlay`

**Events:**

| Event | Payload | Role |
|-------|---------|------|
| `capture-progress` | `{ phase: "countdown" \| "scroll", remainingSecs?, current?, total? }` | Countdown overlay / scroll frame index (HUD overlay only for scroll; not duplicated in main app) |
| `capture-overlay-progress-hud` | `()` | Overlay switches to compact progress HUD |

### Overlay init payload

`CaptureOverlayInitPayload.previewPng` is optional (`None` when live-only flows are requested in future; Menu mode clears preview client-side when selected).

## Consequences

- Sprint 1.1 preview-crop path unchanged when delay is Off and mode is region/window/fullscreen
- Live flows require Screen Recording permission (same as preview)
- macOS scroll capture may require **Accessibility** permission for synthetic keyboard events
- Scrolling quality depends on app scroll behaviour (Page Down ≈ one viewport in browsers; less predictable in native apps with internal scroll areas)
- Sticky headers and repeated layout blocks may stitch imperfectly in v1 — backlog post-QA

## References

- [ADR-006](./006-native-capture-overlay.md)
- [Sprint 2b.3](../../product/sprints.md)
