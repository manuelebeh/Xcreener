use crate::capture::{
    cancel_live_capture, capture_fullscreen as capture_fullscreen_impl,
    capture_native as capture_native_impl, capture_region as capture_region_impl,
    capture_scrolling_window as capture_scrolling_window_impl,
    capture_window as capture_window_impl, get_overlay_bounds, get_window_at_point, list_monitors,
    list_windows, request_scroll_capture_stop, CaptureNativeRequest, CaptureOverlayBounds,
    MonitorInfo, WindowInfo,
};
use crate::overlay;
use tauri::AppHandle;

#[tauri::command]
pub async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, String> {
    capture_region_impl(x, y, width, height).map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn capture_window(window_id: u64) -> Result<Vec<u8>, String> {
    capture_window_impl(window_id).map_err(|error| error.into_message())
}

#[tauri::command]
pub async fn capture_fullscreen(display_id: u32) -> Result<Vec<u8>, String> {
    capture_fullscreen_impl(display_id).map_err(|error| error.into_message())
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

#[tauri::command]
pub async fn show_live_capture_overlay(app: AppHandle) -> Result<CaptureOverlayBounds, String> {
    overlay::open_capture_overlay_with_options(&app, true)
}

#[tauri::command]
pub async fn capture_native_command(
    app: AppHandle,
    request: CaptureNativeRequest,
) -> Result<Vec<u8>, String> {
    capture_native_impl(&app, request)
}

#[tauri::command]
pub async fn capture_scrolling_window_command(
    app: AppHandle,
    window: WindowInfo,
) -> Result<Vec<u8>, String> {
    capture_scrolling_window_impl(&app, window)
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
