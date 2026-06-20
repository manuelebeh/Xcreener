use crate::capture::{
    capture_fullscreen, capture_region, capture_window, CaptureError, CaptureNativeRequest,
    CaptureProgressPayload,
};

use crate::overlay;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static LIVE_CAPTURE_CANCELLED: AtomicBool = AtomicBool::new(false);

pub(crate) fn reset_live_capture_cancelled() {
    LIVE_CAPTURE_CANCELLED.store(false, Ordering::SeqCst);
}

pub(crate) fn ensure_live_capture_not_cancelled() -> Result<(), CaptureError> {
    if LIVE_CAPTURE_CANCELLED.load(Ordering::SeqCst) {
        return Err(CaptureError::Backend("capture cancelled".into()));
    }
    Ok(())
}

pub fn cancel_live_capture() {
    LIVE_CAPTURE_CANCELLED.store(true, Ordering::SeqCst);
}

fn run_countdown(app: &AppHandle, delay_secs: u32) -> Result<(), CaptureError> {
    for remaining in (1..=delay_secs).rev() {
        ensure_live_capture_not_cancelled()?;
        let _ = app.emit(
            "capture-progress",
            CaptureProgressPayload {
                phase: "countdown".into(),
                remaining_secs: Some(remaining),
                current: None,
                total: None,
            },
        );
        std::thread::sleep(Duration::from_secs(1));
    }
    Ok(())
}

fn execute_native_capture(request: &CaptureNativeRequest) -> Result<Vec<u8>, CaptureError> {
    match request.kind.as_str() {
        "region" => {
            let rect = request
                .rect
                .as_ref()
                .ok_or_else(|| CaptureError::Backend("region capture requires rect".into()))?;
            capture_region(rect.x, rect.y, rect.width, rect.height)
        }
        "window" => {
            let window_id = request
                .window_id
                .ok_or_else(|| CaptureError::Backend("window capture requires windowId".into()))?;
            capture_window(window_id)
        }
        "fullscreen" => {
            let monitor_id = request
                .monitor_id
                .ok_or_else(|| CaptureError::Backend("fullscreen capture requires monitorId".into()))?;
            capture_fullscreen(monitor_id)
        }
        other => Err(CaptureError::Backend(format!("unknown capture kind: {other}"))),
    }
}

pub fn capture_native(app: &AppHandle, request: CaptureNativeRequest) -> Result<Vec<u8>, String> {
    reset_live_capture_cancelled();

    if request.delay_secs > 0 {
        run_countdown(app, request.delay_secs).map_err(|error| error.into_message())?;
    }

    ensure_live_capture_not_cancelled().map_err(|error| error.into_message())?;

    overlay::hide_capture_overlay_only(app)?;

    // Let the overlay webview finish hiding before grabbing pixels.
    std::thread::sleep(Duration::from_millis(150));

    ensure_live_capture_not_cancelled().map_err(|error| error.into_message())?;

    execute_native_capture(&request).map_err(|error| error.into_message())
}
