use crate::capture::OverlayWebviewLayout;
use crate::overlay;
use tauri::AppHandle;

pub fn read_overlay_webview_layout(app: &AppHandle) -> Result<OverlayWebviewLayout, String> {
    overlay::read_overlay_webview_layout(app)
}

#[tauri::command]
pub fn get_overlay_webview_layout(app: AppHandle) -> Result<OverlayWebviewLayout, String> {
    read_overlay_webview_layout(&app)
}
