use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::overlay;

#[derive(Serialize, Clone)]
struct CaptureImagePayload {
    bytes: Vec<u8>,
    width: u32,
    height: u32,
}

#[tauri::command]
pub fn e2e_show_main_window(app: AppHandle) -> Result<(), String> {
    crate::tray::show_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn e2e_emit_capture_triggered(app: AppHandle) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    overlay::open_capture_overlay(&app).map(|_| ())
}

#[tauri::command]
pub fn e2e_inject_screenshot(
    app: AppHandle,
    png_bytes: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    crate::tray::show_main_window(&app);
    app.emit(
        "capture-image",
        CaptureImagePayload {
            bytes: png_bytes,
            width,
            height,
        },
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn e2e_temp_export_path() -> Result<String, String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    let path = std::env::temp_dir().join(format!("snapglow-e2e-export-{}.png", std::process::id()));
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn e2e_file_metadata(path: String) -> Result<(bool, u64), String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    let file_path = PathBuf::from(path);
    if !file_path.exists() {
        return Ok((false, 0));
    }

    let size = std::fs::metadata(&file_path)
        .map_err(|error| error.to_string())?
        .len();
    Ok((true, size))
}

#[tauri::command]
pub fn e2e_hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn e2e_is_main_window_visible(app: AppHandle) -> Result<bool, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?
        .is_visible()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn e2e_is_capture_overlay_visible(app: AppHandle) -> Result<bool, String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    app.get_webview_window("capture-overlay")
        .ok_or_else(|| "capture overlay window not found".to_string())?
        .is_visible()
        .map_err(|error| error.to_string())
}
