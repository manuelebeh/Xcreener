use tauri::{AppHandle, Emitter, Manager};

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

    app.emit(
        "capture-triggered",
        serde_json::json!({ "source": "test" }),
    )
    .map_err(|error| error.to_string())
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
