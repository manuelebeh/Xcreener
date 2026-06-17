use crate::capture::{CaptureOverlayBounds, MonitorInfo};
use std::sync::Mutex;
use tauri::{LogicalPosition, LogicalSize, Position, Size, WebviewWindow};

/// Keep WebView2 at 1:1 zoom — `set_zoom(1/scale)` expands `innerWidth` and pushes
/// fixed/absolute UI (toolbar) off-screen on HiDPI Windows.
pub fn configure_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    window.set_zoom(1.0).map_err(|error| error.to_string())
}

#[derive(Clone, PartialEq, Debug)]
struct LayoutFingerprint {
    window_scale: f64,
    bounds_width: u32,
    bounds_height: u32,
    primary_scale: f64,
}

static LAST_FINGERPRINT: Mutex<Option<LayoutFingerprint>> = Mutex::new(None);

fn layout_fingerprint(
    window: &WebviewWindow,
    bounds: &CaptureOverlayBounds,
    monitors: &[MonitorInfo],
) -> LayoutFingerprint {
    let primary_scale = monitors
        .iter()
        .find(|monitor| monitor.is_primary)
        .or_else(|| monitors.first())
        .map(|monitor| monitor.scale_factor)
        .unwrap_or(1.0);

    LayoutFingerprint {
        window_scale: window.scale_factor().unwrap_or(1.0),
        bounds_width: bounds.width,
        bounds_height: bounds.height,
        primary_scale,
    }
}

fn needs_layout_refresh(current: &LayoutFingerprint) -> bool {
    LAST_FINGERPRINT
        .lock()
        .map(|last| last.as_ref() != Some(current))
        .unwrap_or(true)
}

fn mark_layout_refreshed(current: LayoutFingerprint) {
    if let Ok(mut last) = LAST_FINGERPRINT.lock() {
        *last = Some(current);
    }
}

/// Record current layout at startup so the first capture does not trigger a refresh flash.
pub fn seed_layout_fingerprint(
    window: &WebviewWindow,
    bounds: &CaptureOverlayBounds,
    monitors: &[MonitorInfo],
) {
    mark_layout_refreshed(layout_fingerprint(window, bounds, monitors));
}

/// Minimal 1×1 off-screen show — wakes WebView2 DPI without a visible fullscreen flash.
fn refresh_webview_dpi_offscreen(window: &WebviewWindow) -> Result<(), String> {
    const OFF_SCREEN: f64 = -32_000.0;

    window
        .set_position(Position::Logical(LogicalPosition::new(OFF_SCREEN, OFF_SCREEN)))
        .map_err(|error| error.to_string())?;
    window
        .set_size(Size::Logical(LogicalSize::new(1.0, 1.0)))
        .map_err(|error| error.to_string())?;
    configure_overlay_window(window)?;
    window.show().map_err(|error| error.to_string())?;
    window.hide().map_err(|error| error.to_string())
}

/// Only when Windows display scale/bounds changed since the last capture.
pub fn refresh_dpi_if_changed(
    window: &WebviewWindow,
    bounds: &CaptureOverlayBounds,
    monitors: &[MonitorInfo],
) -> Result<(), String> {
    let fingerprint = layout_fingerprint(window, bounds, monitors);

    if needs_layout_refresh(&fingerprint) {
        refresh_webview_dpi_offscreen(window)?;
        mark_layout_refreshed(fingerprint);
    }

    Ok(())
}
