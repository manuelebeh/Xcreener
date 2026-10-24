//! Image bytes cross IPC as raw bodies (`ArrayBuffer` / `Uint8Array` on the JS side)
//! instead of JSON number arrays, which cost seconds of parsing and hundreds of MB
//! for a large capture.

use std::sync::Mutex;
use tauri::ipc::{InvokeBody, Request, Response};

/// Capture handed from the overlay to the main window. JS events are JSON only, so the
/// `capture-image` event carries the dimensions and the bytes wait here.
static PENDING_CAPTURE: Mutex<Option<Vec<u8>>> = Mutex::new(None);

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

pub fn set_pending_capture(bytes: Vec<u8>) {
    *PENDING_CAPTURE.lock().unwrap_or_else(|error| error.into_inner()) = Some(bytes);
}

#[tauri::command]
pub fn stash_capture_image(request: Request<'_>) -> Result<(), String> {
    set_pending_capture(body_bytes(&request)?);
    Ok(())
}

#[tauri::command]
pub fn take_capture_image() -> Result<Response, String> {
    PENDING_CAPTURE
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .take()
        .map(Response::new)
        .ok_or_else(|| "No capture is waiting".into())
}
