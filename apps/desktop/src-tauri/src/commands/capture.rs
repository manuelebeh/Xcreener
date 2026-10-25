use crate::capture::{
    cancel_live_capture, cancel_region_recording, capture_fullscreen as capture_fullscreen_impl,
    capture_native as capture_native_impl, capture_region as capture_region_impl,
    capture_scrolling_window as capture_scrolling_window_impl,
    capture_window as capture_window_impl, get_overlay_bounds, get_window_at_point, list_monitors,
    list_windows, pause_region_recording, request_scroll_capture_stop, resume_region_recording,
    start_region_recording, stop_region_recording, CaptureNativeRequest, CaptureOverlayBounds,
    CaptureRecordStartRequest, CaptureRecordingCompletePayload, MonitorInfo, WindowInfo,
};
use crate::overlay;
use tauri::ipc::Response;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<Response, String> {
    capture_region_impl(x, y, width, height)
        .map(Response::new)
        .map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn capture_window(window_id: u64) -> Result<Response, String> {
    capture_window_impl(window_id)
        .map(Response::new)
        .map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn capture_fullscreen(display_id: u32) -> Result<Response, String> {
    capture_fullscreen_impl(display_id)
        .map(Response::new)
        .map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn list_monitors_command() -> Result<Vec<MonitorInfo>, String> {
    list_monitors().map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn list_windows_command() -> Result<Vec<WindowInfo>, String> {
    list_windows().map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn get_window_at_point_command(x: i32, y: i32) -> Result<Option<WindowInfo>, String> {
    get_window_at_point(x, y).map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn get_capture_overlay_bounds() -> Result<CaptureOverlayBounds, String> {
    get_overlay_bounds().map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn show_capture_overlay(app: AppHandle) -> Result<CaptureOverlayBounds, String> {
    overlay::open_capture_overlay(&app)
}

/// Starts a capture from the main window's button. The preview screenshot must not contain
/// Xcreener itself, so the window is hidden and given a moment to leave the screen first.
/// The overlay then opens from its own thread, exactly like the global shortcut does.
#[tauri::command]
pub fn start_capture_command(app: AppHandle) -> Result<(), String> {
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.hide().map_err(|error| error.to_string())?;
    }

    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(250));
        if let Err(error) = overlay::open_capture_overlay(&app) {
            eprintln!("[Xcreener] failed to open capture overlay: {error}");
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn show_live_capture_overlay(app: AppHandle) -> Result<CaptureOverlayBounds, String> {
    overlay::open_capture_overlay_with_options(&app, true)
}

#[tauri::command]
pub async fn capture_native_command(
    app: AppHandle,
    request: CaptureNativeRequest,
) -> Result<Response, String> {
    capture_native_impl(&app, request).map(Response::new)
}

#[tauri::command]
pub async fn capture_scrolling_window_command(
    app: AppHandle,
    window: WindowInfo,
) -> Result<Response, String> {
    capture_scrolling_window_impl(&app, window).map(Response::new)
}

#[tauri::command]
pub async fn cancel_live_capture_command() -> Result<(), String> {
    cancel_live_capture();
    Ok(())
}

#[tauri::command]
pub async fn stop_scrolling_capture_command() -> Result<(), String> {
    request_scroll_capture_stop();
    Ok(())
}

#[tauri::command]
pub async fn start_region_recording_command(
    app: AppHandle,
    request: CaptureRecordStartRequest,
) -> Result<(), String> {
    start_region_recording(&app, request)
}

#[tauri::command]
pub async fn pause_region_recording_command() -> Result<(), String> {
    pause_region_recording()
}

#[tauri::command]
pub async fn resume_region_recording_command() -> Result<(), String> {
    resume_region_recording()
}

#[tauri::command]
pub async fn stop_region_recording_command(
    app: AppHandle,
) -> Result<CaptureRecordingCompletePayload, String> {
    stop_region_recording(&app)
}

#[tauri::command]
pub async fn cancel_region_recording_command() -> Result<(), String> {
    cancel_region_recording()
}

/// Media the history and recording flows hand to the OS default viewer.
const OPENABLE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "webm"];

/// Only existing media files may be opened, so a compromised WebView cannot launch
/// arbitrary apps, scripts, or URLs through the OS handler.
fn validate_openable_path(path: &str) -> Result<std::path::PathBuf, String> {
    let path = std::path::Path::new(path);
    if !path.is_absolute() {
        return Err("Path must be absolute".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|_| "File not found".to_string())?;
    if !canonical.is_file() {
        return Err("Not a file".into());
    }
    let extension = canonical
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if !OPENABLE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Unsupported file type".into());
    }
    Ok(canonical)
}

#[tauri::command]
pub async fn open_path_command(path: String) -> Result<(), String> {
    let path = validate_openable_path(&path)?;
    open::that(path).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::validate_openable_path;

    #[test]
    fn opens_existing_media_files_only() {
        let dir = tempfile::tempdir().unwrap();
        let video = dir.path().join("clip.MP4");
        std::fs::write(&video, b"x").unwrap();
        let script = dir.path().join("run.command");
        std::fs::write(&script, b"x").unwrap();

        assert!(validate_openable_path(video.to_str().unwrap()).is_ok());
        assert!(validate_openable_path(script.to_str().unwrap()).is_err());
        assert!(validate_openable_path(dir.path().to_str().unwrap()).is_err());
        assert!(validate_openable_path("https://example.com/a.mp4").is_err());
        assert!(validate_openable_path("relative/clip.mp4").is_err());
        assert!(validate_openable_path(dir.path().join("missing.mp4").to_str().unwrap()).is_err());
    }
}

#[tauri::command]
pub async fn capture_overlay_ready(app: AppHandle) -> Result<(), String> {
    overlay::present_capture_overlay(&app)
}

#[tauri::command]
pub async fn hide_capture_overlay(app: AppHandle) -> Result<(), String> {
    overlay::dismiss_capture_overlay(&app)
}

#[tauri::command]
pub async fn cancel_capture_overlay(app: AppHandle) -> Result<(), String> {
    overlay::hide_capture_overlay_only(&app)
}
