mod capture;
mod commands;
mod classification;
mod image_processing;
mod ocr;
mod overlay;
mod redaction;
#[cfg(target_os = "macos")]
mod overlay_macos;
#[cfg(target_os = "windows")]
mod overlay_windows;
mod shortcuts;
mod test_support;
mod tray;

use commands::{
    cancel_capture_overlay, cancel_live_capture_command, capture_fullscreen, capture_native_command,
    capture_overlay_ready, capture_region, capture_scrolling_window_command, capture_window,
    classify_content_command, compress_export_bytes_command, crop_image_command,
    detect_content_bounds_command, detect_sensitive_data, export_image, get_capture_overlay_bounds,
    get_setting, get_window_at_point_command, get_overlay_webview_layout, hide_capture_overlay,
    list_monitors_command, list_windows_command, recognize_text_command, set_setting,
    show_capture_overlay, show_live_capture_overlay, stop_scrolling_capture_command,
};
use shortcuts::{
    build_global_shortcut_plugin, init_shortcut_state, register_capture_shortcut,
    update_capture_shortcut,
};
use test_support::{
    e2e_emit_capture_triggered, e2e_file_metadata, e2e_hide_main_window,
    e2e_inject_screenshot, e2e_is_capture_overlay_visible, e2e_is_main_window_visible,
    e2e_show_main_window, e2e_temp_export_path,
};
use tauri::{Manager, WindowEvent};

#[cfg(target_os = "windows")]
mod windows_dpi;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    windows_dpi::ensure_per_monitor_awareness();

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
            overlay::setup_overlay_window(app.handle())?;

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
            capture_native_command,
            capture_scrolling_window_command,
            cancel_live_capture_command,
            stop_scrolling_capture_command,
            show_live_capture_overlay,
            list_monitors_command,
            list_windows_command,
            get_window_at_point_command,
            get_capture_overlay_bounds,
            get_overlay_webview_layout,
            show_capture_overlay,
            capture_overlay_ready,
            hide_capture_overlay,
            cancel_capture_overlay,
            export_image,
            detect_sensitive_data,
            recognize_text_command,
            detect_content_bounds_command,
            crop_image_command,
            compress_export_bytes_command,
            classify_content_command,
            get_setting,
            set_setting,
            update_capture_shortcut,
            e2e_show_main_window,
            e2e_emit_capture_triggered,
            e2e_inject_screenshot,
            e2e_temp_export_path,
            e2e_file_metadata,
            e2e_hide_main_window,
            e2e_is_main_window_visible,
            e2e_is_capture_overlay_visible,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
