use std::str::FromStr;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub const DEFAULT_CAPTURE_SHORTCUT: &str = "CmdOrControl+Shift+KeyS";

pub struct CaptureShortcutState(pub Mutex<String>);

pub fn init_shortcut_state(app: &AppHandle) {
    app.manage(CaptureShortcutState(Mutex::new(
        DEFAULT_CAPTURE_SHORTCUT.to_string(),
    )));
}

pub fn register_capture_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();

    if let Some(state) = app.try_state::<CaptureShortcutState>() {
        let previous = state.0.lock().map_err(|e| e.to_string())?.clone();
        if !previous.is_empty() {
            if let Ok(parsed) = Shortcut::from_str(&previous) {
                let _ = global_shortcut.unregister(parsed);
            }
        }
    }

    global_shortcut
        .register(shortcut)
        .map_err(|error| error.to_string())?;

    if let Some(state) = app.try_state::<CaptureShortcutState>() {
        let mut current = state.0.lock().map_err(|e| e.to_string())?;
        *current = shortcut.to_string();
    }

    Ok(())
}

#[tauri::command]
pub fn update_capture_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    register_capture_shortcut(&app, &shortcut)
}

pub fn build_global_shortcut_plugin() -> impl tauri::plugin::Plugin<tauri::Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                let _ = app.emit(
                    "capture-triggered",
                    serde_json::json!({ "source": "shortcut" }),
                );
            }
        })
        .build()
}
