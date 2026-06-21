# ADR-008 - Screen region recording (GIF / MP4)

**Status:** Accepted  
**Date:** 2026-06-20  
**Sprint:** 2b.4

## Context

ADR-006/007 established PNG capture via frozen preview crop or native `xcap` grabs. FR-011 requires short screen recordings (< 30 s) of a user-selected region, exported primarily as optimized GIF (< 10 MB for 10 s) with optional MP4 (H.264).

The editor beautification pipeline is PNG-only; recorded media must bypass the editor and go to export + history.

## Decision

### Scope (v1)

- **Region (rectangle) only** — same overlay selection as static region capture (window/fullscreen targets shown in UI but disabled until backend wired)
- **Max duration:** GIF **8 s** auto-stop (short shareable loops); MP4 **30 s** auto-stop
- **Primary output:** GIF with user-selectable quality (`low` | `medium` | `high`)
- **Secondary output:** MP4 H.264 (P1) via `openh264`

### Capture strategy

| Platform | Frame source |
|----------|--------------|
| macOS | **ScreenCaptureKit** streaming at ~30 fps target, region crop at retina scale (`macos_record.rs`). Screen Recording permission required. SCK emits frames only when content changes (VFR). |
| Windows | `capture_region` polling at ~20 fps (50 ms interval) via `xcap` (`session.rs`). `windows_record.rs` adapter; WGC streaming deferred to backlog. |

Each frame is stamped with **active elapsed ms** (wall clock minus paused intervals) in the filename: `frame_{index:05}_{timestamp_ms:09}.rgba`. Frames are written as raw RGBA under a `tempfile` directory during capture to avoid OOM.

### Session lifecycle

| Command | Action |
|---------|--------|
| `start_region_recording_command` | Validate rect, hide overlay, spawn capture thread, show progress HUD |
| `pause_region_recording_command` | Pause frame collection |
| `resume_region_recording_command` | Resume |
| `stop_region_recording_command` | Stop, encode, return `CaptureRecordingCompletePayload` |
| `cancel_region_recording_command` | Discard temp frames, abort |

**Stop** saves and encodes; **Cancel** discards (distinct from scroll **Done**).

### IPC

- Progress: `capture-progress` with `phase: "recording"`, `elapsedSecs`, `paused`, `frameCount`
- Complete: `capture-recording-complete` to main window with file path + metadata + optional `thumbnailPng`

### GIF encoding (AC-007)

Post-stop pipeline in `capture/record/encode_gif.rs`:

1. **Timeline:** resample irregular VFR captures onto a **20 fps grid**; collapse consecutive grid points that resolve to the same source frame into one GIF frame with accumulated delay (real-time playback, bounded frame count)
2. **Width cap** up front by quality preset (720 / 900 / 1080 px) — avoids grinding retina frames through the budget loop
3. Global palette via `imagequant` (256 colors; speed varies by quality)
4. Write with `gif` crate (`Repeat::Infinite`)
5. If over budget (10 / 14 / 20 MB per 10 s for low / medium / high): reduce colors, then downscale ×0.85 iteratively

### MP4 encoding (AC-008, P1)

`capture/record/encode_mp4.rs` — **CFR resampling** from timestamped VFR frames:

- Derive fps from frame count and active duration, clamped **12–30 fps**
- Walk a fixed time grid; at each instant re-encode the frame that was on screen (static stretches become small P-frames, not one long VFR sample)
- `openh264` with `enable_skip_frame(false)` + keyframe every ~2 s; mux with `mp4` crate (Annex B → avcC)

Fixes QuickTime “freeze at N seconds” when SCK/polling produced sparse frames during static content or after pause.

### Post-capture UX

- **No editor** — `capture-recording-complete` triggers save dialog (`saveRecording.ts`), history entry (`persistRecording.ts`, `format: gif|mp4`), staging file removed after copy
- **`open_path_command`:** opens saved file in OS default player when user picks a save location (`useCaptureSession.ts`); history **Open file** for gif/mp4 (`useOpenCapture.ts`)
- Thumbnail: post-stop `capture_region` snapshot PNG for history grid

## Consequences

- Recording always uses native/live path (overlay hidden during capture)
- Reuses progress HUD pattern from ADR-007 scroll capture
- History schema `format` column supports `gif` and `mp4`
- Window/fullscreen recording deferred to backlog

## References

- [ADR-007](./007-live-capture-flows.md)
- [FR-011](../../product/Product%20Requirements.md)
- [Sprint 2b.4](../../product/Sprints%20%26%20Implementations.md)
