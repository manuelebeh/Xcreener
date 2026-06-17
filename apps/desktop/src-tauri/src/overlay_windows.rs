use tauri::WebviewWindow;

pub fn configure_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    window.set_zoom(1.0).map_err(|error| error.to_string())
}
