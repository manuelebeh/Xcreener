use crate::capture::platform;
use crate::capture::stitch::{append_scrolled_frame, frames_identical};
use crate::capture::types::WindowInfo;
use crate::capture::{capture_xcap_window, encode_png, resolve_window, CaptureError};
use crate::overlay;
use image::RgbaImage;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::native::{ensure_live_capture_not_cancelled, reset_live_capture_cancelled};
use crate::capture::CaptureProgressPayload;

const MAX_STITCHED_HEIGHT: u32 = 30_000;
const MAX_ITERATIONS: u32 = 50;
const SETTLE_MS: u64 = 550;
const TOP_SETTLE_MS: u64 = 600;

static SCROLL_CAPTURE_STOP_REQUESTED: AtomicBool = AtomicBool::new(false);

pub fn request_scroll_capture_stop() {
    SCROLL_CAPTURE_STOP_REQUESTED.store(true, Ordering::SeqCst);
}

fn reset_scroll_capture_stop() {
    SCROLL_CAPTURE_STOP_REQUESTED.store(false, Ordering::SeqCst);
}

fn scroll_capture_stop_requested() -> bool {
    SCROLL_CAPTURE_STOP_REQUESTED.load(Ordering::SeqCst)
}

fn sleep_until_stop_or_elapsed(total_ms: u64) -> bool {
    const STEP_MS: u64 = 50;
    let mut elapsed = 0;

    while elapsed < total_ms {
        if scroll_capture_stop_requested() {
            return true;
        }

        let step = STEP_MS.min(total_ms - elapsed);
        std::thread::sleep(Duration::from_millis(step));
        elapsed += step;
    }

    scroll_capture_stop_requested()
}

fn decode_png(png_bytes: &[u8]) -> Result<RgbaImage, CaptureError> {
    image::load_from_memory(png_bytes)
        .map_err(|error| CaptureError::Backend(error.to_string()))
        .map(|image| image.to_rgba8())
}

pub fn capture_scrolling_window(app: &AppHandle, target: WindowInfo) -> Result<Vec<u8>, String> {
    reset_live_capture_cancelled();
    reset_scroll_capture_stop();

    #[cfg(target_os = "macos")]
    platform::ensure_screen_capture_permission().map_err(|error| error.into_message())?;

    overlay::show_capture_progress_hud(app)?;
    std::thread::sleep(Duration::from_millis(200));
    ensure_live_capture_not_cancelled().map_err(|error| error.into_message())?;

    let _ = app.emit(
        "capture-progress",
        CaptureProgressPayload {
            current: Some(0),
            ..CaptureProgressPayload::with_phase("scroll")
        },
    );

    let window = resolve_window(&target).map_err(|error| error.into_message())?;
    let _ = platform::focus_xcap_window(&window);
    std::thread::sleep(Duration::from_millis(250));

    let _ = platform::scroll_xcap_window_to_top(&window);
    if sleep_until_stop_or_elapsed(TOP_SETTLE_MS) {
        let png = capture_xcap_window(&window).map_err(|error| error.into_message())?;
        return Ok(png);
    }

    let first_png = capture_xcap_window(&window).map_err(|error| error.into_message())?;
    let first_frame = decode_png(&first_png).map_err(|error| error.into_message())?;
    let mut canvas = first_frame.clone();
    let mut previous_frame = first_frame;

    let _ = app.emit(
        "capture-progress",
        CaptureProgressPayload {
            current: Some(1),
            ..CaptureProgressPayload::with_phase("scroll")
        },
    );

    for iteration in 2..=MAX_ITERATIONS {
        if scroll_capture_stop_requested() {
            break;
        }

        ensure_live_capture_not_cancelled().map_err(|error| error.into_message())?;

        if canvas.height() >= MAX_STITCHED_HEIGHT {
            break;
        }

        let window = resolve_window(&target).map_err(|error| error.into_message())?;
        let _ = platform::scroll_xcap_window_page_down(&window);

        if sleep_until_stop_or_elapsed(SETTLE_MS) {
            break;
        }

        if scroll_capture_stop_requested() {
            break;
        }

        let next_png = capture_xcap_window(&window).map_err(|error| error.into_message())?;

        if scroll_capture_stop_requested() {
            break;
        }
        let next_frame = decode_png(&next_png).map_err(|error| error.into_message())?;

        if frames_identical(&previous_frame, &next_frame) {
            break;
        }

        let Ok((stitched, appended)) = append_scrolled_frame(&canvas, &next_frame) else {
            break;
        };

        if !appended || stitched.height() == canvas.height() {
            break;
        }

        canvas = stitched;
        previous_frame = next_frame;

        let _ = app.emit(
            "capture-progress",
            CaptureProgressPayload {
                current: Some(iteration),
                ..CaptureProgressPayload::with_phase("scroll")
            },
        );
    }

    if canvas.as_raw().is_empty() {
        return Err(CaptureError::InvalidDimensions.into_message());
    }

    encode_png(canvas.as_raw(), canvas.width(), canvas.height())
        .map_err(|error| error.into_message())
}
