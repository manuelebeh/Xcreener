mod commands;
mod shortcuts;
mod tray;

use commands::{
    capture_fullscreen, capture_region, capture_window, export_image, get_setting, set_setting,
};
use shortcuts::{build_global_shortcut_plugin, init_shortcut_state, register_capture_shortcut, update_capture_shortcut};
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(build_global_shortcut_plugin())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;

                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    None::<Vec<&str>>,
                ))?;
            }

            init_shortcut_state(app.handle());
            register_capture_shortcut(app.handle(), shortcuts::DEFAULT_CAPTURE_SHORTCUT)?;
            tray::setup_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_handle.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_region,
            capture_window,
            capture_fullscreen,
            export_image,
            get_setting,
            set_setting,
            update_capture_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
