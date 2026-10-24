//! Image bytes cross IPC as raw bodies (`ArrayBuffer` / `Uint8Array` on the JS side)
//! instead of JSON number arrays, which cost seconds of parsing and hundreds of MB
//! for a large capture.

use std::sync::Mutex;
use tauri::ipc::{InvokeBody, Request, Response};

/// JS events are JSON only, so an event carries a flag and the bytes wait in a slot
/// until the webview takes them with a raw-body command.
pub struct ImageSlot(Mutex<Option<Vec<u8>>>);

impl ImageSlot {
    const fn new() -> Self {
        Self(Mutex::new(None))
    }

    pub fn set(&self, bytes: Vec<u8>) {
        *self.0.lock().unwrap_or_else(|error| error.into_inner()) = Some(bytes);
    }

    fn take(&self, missing: &str) -> Result<Response, String> {
        self.0
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .take()
            .map(Response::new)
            .ok_or_else(|| missing.to_string())
    }
}

/// Capture handed from the overlay to the main window (`capture-image`).
pub static PENDING_CAPTURE: ImageSlot = ImageSlot::new();
/// Frozen screen shown behind the selection (`capture-overlay-init`).
pub static OVERLAY_PREVIEW: ImageSlot = ImageSlot::new();
/// Last frame of a finished recording (`capture-recording-complete`).
pub static RECORDING_THUMBNAIL: ImageSlot = ImageSlot::new();

pub fn body_bytes(request: &Request<'_>) -> Result<Vec<u8>, String> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        InvokeBody::Json(_) => Err("Expected raw image bytes".into()),
    }
}

pub fn header<'a>(request: &'a Request<'_>, name: &str) -> Result<&'a str, String> {
    request
        .headers()
        .get(name)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| format!("Missing {name} header"))
}

#[tauri::command]
pub fn stash_capture_image(request: Request<'_>) -> Result<(), String> {
    PENDING_CAPTURE.set(body_bytes(&request)?);
    Ok(())
}

#[tauri::command]
pub fn take_capture_image() -> Result<Response, String> {
    PENDING_CAPTURE.take("No capture is waiting")
}

#[tauri::command]
pub fn take_overlay_preview() -> Result<Response, String> {
    OVERLAY_PREVIEW.take("No overlay preview is waiting")
}

#[tauri::command]
pub fn take_recording_thumbnail() -> Result<Response, String> {
    RECORDING_THUMBNAIL.take("No recording thumbnail is waiting")
}
