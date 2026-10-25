use crate::{overlay, shortcuts::CaptureShortcutState};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Wry,
};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// The "Capture" menu item, kept so its shortcut label follows user changes.
pub struct TrayCaptureItem(MenuItem<Wry>);

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// The capture shortcut, only when it is actually registered.
fn registered_capture_shortcut(app: &AppHandle) -> Option<String> {
    let shortcut = app
        .try_state::<CaptureShortcutState>()?
        .0
        .lock()
        .ok()?
        .clone();
    app.global_shortcut()
        .is_registered(shortcut.as_str())
        .then_some(shortcut)
}

pub fn update_capture_accelerator(app: &AppHandle, shortcut: &str) {
    if let Some(item) = app.try_state::<TrayCaptureItem>() {
        let _ = item.0.set_accelerator(Some(shortcut));
    }
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let capture_item = MenuItem::with_id(
        app,
        "capture",
        "Capture",
        true,
        registered_capture_shortcut(app),
    )?;
    let reopen_item = MenuItem::with_id(app, "reopen", "Reopen Last Capture", true, None::<&str>)?;
    let history_item = MenuItem::with_id(app, "history", "History", true, None::<&str>)?;
    let open_item = MenuItem::with_id(app, "open", "Open Xcreener", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(
        app,
        "settings",
        "Settings…",
        true,
        Some("CmdOrControl+Comma"),
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Xcreener", true, Some("CmdOrControl+Q"))?;
    let menu = Menu::with_items(
        app,
        &[
            &capture_item,
            &reopen_item,
            &history_item,
            &PredefinedMenuItem::separator(app)?,
            &open_item,
            &settings_item,
            &PredefinedMenuItem::separator(app)?,
            &quit_item,
        ],
    )?;
    app.manage(TrayCaptureItem(capture_item));

    let icon = app
        .default_window_icon()
        .ok_or_else(|| tauri::Error::FailedToReceiveMessage)?;

    let _tray = TrayIconBuilder::new()
        .icon(icon.clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => {
                let app = app.clone();
                std::thread::spawn(move || {
                    if let Err(error) = overlay::open_capture_overlay(&app) {
                        eprintln!("[Xcreener] failed to open capture overlay: {error}");
                    }
                });
            }
            "reopen" => {
                let _ = app.emit("open-latest-capture", ());
                show_main_window(app);
            }
            "history" => {
                let _ = app.emit("navigate-history", ());
                show_main_window(app);
            }
            "open" => show_main_window(app),
            "settings" => {
                let _ = app.emit("navigate-settings", ());
                show_main_window(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
