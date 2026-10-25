use crate::{overlay, tray};
use std::str::FromStr;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub const DEFAULT_CAPTURE_SHORTCUT: &str = "CmdOrControl+Shift+Digit2";

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
    tray::update_capture_accelerator(app, shortcut);

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
                let app = app.clone();
                std::thread::spawn(move || {
                    if let Err(error) = overlay::open_capture_overlay(&app) {
                        eprintln!("[SnapGlow] failed to open capture overlay: {error}");
                    }
                });
            }
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;
    use tauri_plugin_global_shortcut::Shortcut;

    #[test]
    fn default_capture_shortcut_parses() {
        let shortcut = Shortcut::from_str(DEFAULT_CAPTURE_SHORTCUT);
        assert!(shortcut.is_ok(), "expected valid default shortcut");
    }

    #[test]
    fn invalid_shortcut_is_rejected() {
        let shortcut = Shortcut::from_str("not-a-valid-shortcut");
        assert!(shortcut.is_err());
    }

    #[test]
    fn common_capture_shortcut_variants_parse() {
        for value in [
            "CmdOrControl+Shift+KeyS",
            "Alt+KeyX",
            "CmdOrControl+Alt+KeyC",
        ] {
            assert!(
                Shortcut::from_str(value).is_ok(),
                "expected {value} to parse"
            );
        }
    }
}
