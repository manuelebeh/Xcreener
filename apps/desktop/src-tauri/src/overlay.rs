use crate::capture::{
    capture_desktop_preview, get_overlay_bounds, list_monitors, CaptureOverlayBounds,
    CaptureOverlayInitPayload, MonitorInfo,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Size};

#[cfg(target_os = "macos")]
use crate::overlay_macos;
#[cfg(target_os = "windows")]
use crate::overlay_windows;

const OVERLAY_LABEL: &str = "capture-overlay";

static OVERLAY_AWAITING_READY: AtomicBool = AtomicBool::new(false);

struct PreparedOverlayOpen {
    bounds: CaptureOverlayBounds,
    monitors: Vec<MonitorInfo>,
    preview_png: Vec<u8>,
}

fn clear_overlay_pending() {
    OVERLAY_AWAITING_READY.store(false, Ordering::SeqCst);
}

fn present_overlay_window(overlay: &tauri::WebviewWindow) -> Result<(), String> {
    overlay.show().map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    overlay_macos::present_overlay_window(overlay).map_err(|error| error.to_string())?;

    #[cfg(not(target_os = "macos"))]
    {
        let _ = overlay.set_focus();
    }

    Ok(())
}

fn sync_overlay_geometry(
    overlay: &tauri::WebviewWindow,
    bounds: &CaptureOverlayBounds,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    overlay_macos::configure_overlay_window(overlay)?;

    #[cfg(target_os = "windows")]
    overlay_windows::configure_overlay_window(overlay)?;

    overlay
        .set_position(Position::Logical(LogicalPosition::new(
            bounds.x as f64,
            bounds.y as f64,
        )))
        .map_err(|error| error.to_string())?;
    overlay
        .set_size(Size::Logical(LogicalSize::new(
            bounds.width as f64,
            bounds.height as f64,
        )))
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn setup_overlay_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or("capture overlay window not found in tauri config")?;

    #[cfg(target_os = "macos")]
    overlay_macos::configure_overlay_window(&overlay)
        .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;

    #[cfg(target_os = "windows")]
    overlay_windows::configure_overlay_window(&overlay)
        .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;

    // Prime geometry while hidden so the first capture session starts aligned.
    if let Ok(bounds) = get_overlay_bounds() {
        let _ = sync_overlay_geometry(&overlay, &bounds);

        #[cfg(target_os = "macos")]
        {
            // macOS borderless windows need one show/hide cycle for stable insets.
            let _ = overlay.show();
            let _ = sync_overlay_geometry(&overlay, &bounds);
            let _ = overlay.hide();
        }
    }

    Ok(())
}

fn prepare_overlay_open() -> Result<PreparedOverlayOpen, String> {
    let bounds = get_overlay_bounds().map_err(|error| error.into_message())?;
    let monitors = list_monitors().map_err(|error| error.into_message())?;

    // Capture immediately while the user's app is still frontmost.
    // Do not touch SnapGlow windows before this snapshot.
    let preview_png = capture_desktop_preview().map_err(|error| error.into_message())?;

    Ok(PreparedOverlayOpen {
        bounds,
        monitors,
        preview_png,
    })
}

fn show_prepared_overlay(
    app: &AppHandle,
    prepared: PreparedOverlayOpen,
) -> Result<CaptureOverlayBounds, String> {
    let PreparedOverlayOpen {
        bounds,
        monitors,
        preview_png,
    } = prepared;

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }

    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    let _ = overlay.hide();

    sync_overlay_geometry(&overlay, &bounds)?;

    overlay
        .emit(
            "capture-overlay-init",
            CaptureOverlayInitPayload {
                bounds: bounds.clone(),
                monitors,
                preview_png,
            },
        )
        .map_err(|error| error.to_string())?;

    OVERLAY_AWAITING_READY.store(true, Ordering::SeqCst);

    Ok(bounds)
}

pub fn present_capture_overlay(app: &AppHandle) -> Result<(), String> {
    if !OVERLAY_AWAITING_READY.swap(false, Ordering::SeqCst) {
        return Ok(());
    }

    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    present_overlay_window(&overlay)
}

pub fn dismiss_capture_overlay(app: &AppHandle) -> Result<(), String> {
    clear_overlay_pending();

    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        overlay.hide().map_err(|error| error.to_string())?;
    }

    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|error| error.to_string())?;
        main_window.set_focus().map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn dispatch_show_prepared_overlay(
    app: &AppHandle,
    prepared: PreparedOverlayOpen,
) -> Result<CaptureOverlayBounds, String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::MainThreadMarker;

        if MainThreadMarker::new().is_some() {
            return show_prepared_overlay(app, prepared);
        }

        let (tx, rx) = std::sync::mpsc::sync_channel(1);
        let app_for_main = app.clone();
        app.run_on_main_thread(move || {
            let _ = tx.send(show_prepared_overlay(&app_for_main, prepared));
        })
        .map_err(|error| error.to_string())?;

        return rx.recv().map_err(|error| error.to_string())?;
    }

    #[cfg(not(target_os = "macos"))]
    show_prepared_overlay(app, prepared)
}

pub fn open_capture_overlay(app: &AppHandle) -> Result<CaptureOverlayBounds, String> {
    let prepared = prepare_overlay_open()?;
    dispatch_show_prepared_overlay(app, prepared)
}
