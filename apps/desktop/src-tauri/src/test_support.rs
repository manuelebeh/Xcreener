use std::path::PathBuf;

use serde::Serialize;
use tauri::ipc::Request;
use tauri::{AppHandle, Emitter, Manager};

use crate::commands::raw_ipc;
use crate::overlay;

fn parse_dimension(request: &Request<'_>, name: &str) -> Result<u32, String> {
    raw_ipc::header(request, name)?
        .parse()
        .map_err(|_| format!("Invalid {name} header"))
}

#[derive(Serialize, Clone)]
struct CaptureImagePayload {
    width: u32,
    height: u32,
}

#[tauri::command]
pub fn e2e_show_main_window(app: AppHandle) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

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
pub fn e2e_inject_screenshot(app: AppHandle, request: Request<'_>) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    let png_bytes = raw_ipc::body_bytes(&request)?;
    let width = parse_dimension(&request, "width")?;
    let height = parse_dimension(&request, "height")?;

    crate::tray::show_main_window(&app);
    raw_ipc::PENDING_CAPTURE.set(png_bytes);
    app.emit("capture-image", CaptureImagePayload { width, height })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn e2e_temp_export_path(app: AppHandle) -> Result<String, String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    // Inside $APPDATA: the main window's fs scope does not include the temp directory.
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(format!("snapglow-e2e-export-{}.png", std::process::id()));
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
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn e2e_is_main_window_visible(app: AppHandle) -> Result<bool, String> {
    if !cfg!(debug_assertions) {
        return Err("e2e helpers are only available in debug builds".into());
    }

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
