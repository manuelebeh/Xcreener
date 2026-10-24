use crate::capture::{
    capture_desktop_preview, get_overlay_bounds, list_monitors, CaptureErrorPayload,
    CaptureOverlayBounds, CaptureOverlayInitPayload, MonitorInfo, OverlayWebviewLayout,
};
use crate::tray;
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
    preview_png: Option<Vec<u8>>,
    live_overlay: bool,
}

fn clear_overlay_pending() {
    OVERLAY_AWAITING_READY.store(false, Ordering::SeqCst);
}

fn present_overlay_window(
    overlay: &tauri::WebviewWindow,
    bounds: &CaptureOverlayBounds,
    monitors: &[MonitorInfo],
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    overlay_windows::refresh_dpi_if_changed(overlay, bounds, monitors)?;

    sync_overlay_geometry(overlay, bounds, monitors)?;

    overlay.show().map_err(|error| error.to_string())?;

    // WebView2 applies DPI/bounds correctly only after one visible layout pass.
    sync_overlay_geometry(overlay, bounds, monitors)?;

    #[cfg(target_os = "macos")]
    overlay_macos::present_overlay_window(overlay).map_err(|error| error.to_string())?;

    #[cfg(not(target_os = "macos"))]
    {
        let _ = overlay.set_focus();
    }

    if let Ok(layout) = read_overlay_webview_layout_from_window(overlay) {
        let _ = overlay.emit("capture-overlay-presented", layout);
    }

    Ok(())
}

pub fn read_overlay_webview_layout(app: &AppHandle) -> Result<OverlayWebviewLayout, String> {
    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    read_overlay_webview_layout_from_window(&overlay)
}

fn read_overlay_webview_layout_from_window(
    overlay: &tauri::WebviewWindow,
) -> Result<OverlayWebviewLayout, String> {
    let scale = overlay.scale_factor().map_err(|error| error.to_string())?;
    let size = overlay.inner_size().map_err(|error| error.to_string())?;

    Ok(OverlayWebviewLayout {
        scale_factor: scale,
        inner_width: size.width as f64 / scale,
        inner_height: size.height as f64 / scale,
    })
}

fn sync_overlay_geometry(
    overlay: &tauri::WebviewWindow,
    bounds: &CaptureOverlayBounds,
    _monitors: &[MonitorInfo],
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    overlay_macos::configure_overlay_window(overlay)?;

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

    #[cfg(target_os = "windows")]
    overlay_windows::configure_overlay_window(overlay)?;

    Ok(())
}

pub fn setup_overlay_window(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or("capture overlay window not found in tauri config")?;

    #[cfg(target_os = "macos")]
    overlay_macos::configure_overlay_window(&overlay)
        .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;

    // Prime geometry while hidden so the first capture session starts aligned.
    if let Ok(bounds) = get_overlay_bounds() {
        if let Ok(monitors) = list_monitors() {
            let _ = sync_overlay_geometry(&overlay, &bounds, &monitors);

            #[cfg(target_os = "windows")]
            overlay_windows::seed_layout_fingerprint(&overlay, &bounds, &monitors);

            #[cfg(target_os = "macos")]
            {
                // macOS borderless windows need one show/hide cycle for stable insets.
                let _ = overlay.show();
                let _ = sync_overlay_geometry(&overlay, &bounds, &monitors);
                let _ = overlay.hide();
            }
        }
    }

    Ok(())
}

fn prepare_overlay_open(skip_preview: bool) -> Result<PreparedOverlayOpen, String> {
    let bounds = get_overlay_bounds().map_err(|error| error.into_message())?;
    let monitors = list_monitors().map_err(|error| error.into_message())?;

    let preview_png = if skip_preview {
        None
    } else {
        // Capture immediately while the user's app is still frontmost.
        Some(capture_desktop_preview().map_err(|error| error.into_message())?)
    };

    Ok(PreparedOverlayOpen {
        bounds,
        monitors,
        preview_png,
        live_overlay: skip_preview,
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
        live_overlay,
    } = prepared;

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }

    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    let _ = overlay.hide();

    sync_overlay_geometry(&overlay, &bounds, &monitors)?;

    overlay
        .emit(
            "capture-overlay-init",
            CaptureOverlayInitPayload {
                bounds: bounds.clone(),
                monitors,
                preview_png,
                live_overlay,
                webview_layout: None,
            },
        )
        .map_err(|error| error.to_string())?;

    OVERLAY_AWAITING_READY.store(true, Ordering::SeqCst);

    Ok(bounds)
}

pub fn present_capture_overlay(app: &AppHandle) -> Result<(), String> {
    dispatch_on_main_thread(app, present_capture_overlay_impl)
}

fn present_capture_overlay_impl(app: &AppHandle) -> Result<(), String> {
    if !OVERLAY_AWAITING_READY.swap(false, Ordering::SeqCst) {
        return Ok(());
    }

    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    let bounds = get_overlay_bounds().map_err(|error| error.into_message())?;
    let monitors = list_monitors().map_err(|error| error.into_message())?;

    present_overlay_window(&overlay, &bounds, &monitors)
}

pub fn hide_capture_overlay_only(app: &AppHandle) -> Result<(), String> {
    dispatch_on_main_thread(app, hide_capture_overlay_only_impl)
}

fn hide_capture_overlay_only_impl(app: &AppHandle) -> Result<(), String> {
    clear_overlay_pending();

    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        set_overlay_click_through(&overlay, false)?;
        overlay.hide().map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub fn show_capture_progress_hud(app: &AppHandle) -> Result<(), String> {
    dispatch_on_main_thread(app, show_capture_progress_hud_impl)
}

fn show_capture_progress_hud_impl(app: &AppHandle) -> Result<(), String> {
    clear_overlay_pending();

    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "capture overlay window not found".to_string())?;

    let bounds = crate::capture::get_overlay_bounds().map_err(|error| error.into_message())?;

    const HUD_WIDTH: f64 = 420.0;
    const HUD_HEIGHT: f64 = 48.0;
    const HUD_MARGIN_BOTTOM: f64 = 24.0;

    let x = bounds.x as f64 + (bounds.width as f64 - HUD_WIDTH) / 2.0;
    let y = bounds.y as f64 + bounds.height as f64 - HUD_HEIGHT - HUD_MARGIN_BOTTOM;

    overlay
        .set_position(Position::Logical(LogicalPosition::new(x, y)))
        .map_err(|error| error.to_string())?;
    overlay
        .set_size(Size::Logical(LogicalSize::new(HUD_WIDTH, HUD_HEIGHT)))
        .map_err(|error| error.to_string())?;

    overlay
        .emit("capture-overlay-progress-hud", ())
        .map_err(|error| error.to_string())?;

    set_overlay_click_through(&overlay, false)?;

    #[cfg(target_os = "macos")]
    overlay_macos::present_overlay_window(&overlay).map_err(|error| error.to_string())?;

    #[cfg(not(target_os = "macos"))]
    {
        overlay.show().map_err(|error| error.to_string())?;
        let _ = overlay.set_focus();
    }

    Ok(())
}

fn set_overlay_click_through(overlay: &tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    return overlay_macos::set_overlay_click_through(overlay, enabled);

    #[cfg(target_os = "windows")]
    return overlay_windows::set_overlay_click_through(overlay, enabled);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (overlay, enabled);
        Ok(())
    }
}

pub fn dismiss_capture_overlay(app: &AppHandle) -> Result<(), String> {
    dispatch_on_main_thread(app, dismiss_capture_overlay_impl)
}

fn dismiss_capture_overlay_impl(app: &AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        set_overlay_click_through(&overlay, false)?;
    }

    hide_capture_overlay_only_impl(app)?;

    if let Some(main_window) = app.get_webview_window("main") {
        main_window.show().map_err(|error| error.to_string())?;
        main_window.set_focus().map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn dispatch_on_main_thread<T, F>(app: &AppHandle, f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&AppHandle) -> Result<T, String> + Send + 'static,
{
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::MainThreadMarker;

        if MainThreadMarker::new().is_some() {
            return f(app);
        }

        let (tx, rx) = std::sync::mpsc::sync_channel(1);
        let app_for_main = app.clone();
        app.run_on_main_thread(move || {
            let _ = tx.send(f(&app_for_main));
        })
        .map_err(|error| error.to_string())?;

        rx.recv().map_err(|error| error.to_string())?
    }

    #[cfg(not(target_os = "macos"))]
    f(app)
}

fn dispatch_show_prepared_overlay(
    app: &AppHandle,
    prepared: PreparedOverlayOpen,
) -> Result<CaptureOverlayBounds, String> {
    dispatch_on_main_thread(app, move |app| show_prepared_overlay(app, prepared))
}

pub fn open_capture_overlay(app: &AppHandle) -> Result<CaptureOverlayBounds, String> {
    open_capture_overlay_with_options(app, false)
}

pub fn open_capture_overlay_with_options(
    app: &AppHandle,
    skip_preview: bool,
) -> Result<CaptureOverlayBounds, String> {
    let prepared = match prepare_overlay_open(skip_preview) {
        Ok(prepared) => prepared,
        Err(error) => {
            report_capture_failure(app, &error);
            return Err(error);
        }
    };

    match dispatch_show_prepared_overlay(app, prepared) {
        Ok(bounds) => Ok(bounds),
        Err(error) => {
            report_capture_failure(app, &error);
            Err(error)
        }
    }
}

pub fn report_capture_failure(app: &AppHandle, message: &str) {
    let message = message.to_string();
    let _ = dispatch_on_main_thread(app, move |app| {
        tray::show_main_window(app);
        app.emit(
            "capture-error",
            CaptureErrorPayload { message },
        )
        .map_err(|error| error.to_string())
    });
}
