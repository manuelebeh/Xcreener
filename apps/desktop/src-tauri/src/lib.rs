mod capture;
mod classification;
mod cloud_auth;
mod commands;
mod db;
mod entitlement;
mod image_processing;
mod ocr;
mod overlay;
#[cfg(target_os = "macos")]
mod overlay_macos;
#[cfg(target_os = "windows")]
mod overlay_windows;
mod redaction;
mod secure_store;
mod shortcuts;
mod test_support;
mod tray;

use cloud_auth::{cloud_access_token, cloud_auth_complete, cloud_auth_start, cloud_sign_out};
use commands::{
    analyze_content_command, cancel_capture_overlay, cancel_live_capture_command,
    cancel_region_recording_command, capture_fullscreen, capture_native_command,
    capture_overlay_ready, capture_region, capture_scrolling_window_command, capture_window,
    classify_content_command, compress_export_bytes_command, detect_sensitive_data,
    get_capture_overlay_bounds, get_overlay_webview_layout, get_window_at_point_command,
    hide_capture_overlay, list_monitors_command, list_windows_command, open_path_command,
    pause_region_recording_command, recognize_text_command, resume_region_recording_command,
    show_capture_overlay, show_live_capture_overlay, start_capture_command,
    start_region_recording_command, stash_capture_image, stop_region_recording_command,
    stop_scrolling_capture_command, take_capture_image, take_overlay_preview,
    take_recording_thumbnail, verify_entitlement,
};
use db::{
    captures_delete, captures_get, captures_insert, captures_list, captures_list_by_collection,
    captures_list_by_tag, captures_search, captures_uid_exists, captures_update_ocr_text,
    captures_update_tags, collections_add_capture, collections_create, collections_delete,
    collections_for_capture, collections_list, collections_remove_capture, collections_rename,
    db_init, presets_create, presets_delete, presets_list, settings_get, settings_set,
};
use secure_store::{secure_store_delete, secure_store_get, secure_store_set};
use shortcuts::{
    build_global_shortcut_plugin, init_shortcut_state, register_capture_shortcut,
    update_capture_shortcut,
};
use tauri::{Manager, WindowEvent};
use test_support::{
    e2e_emit_capture_triggered, e2e_file_metadata, e2e_hide_main_window, e2e_inject_screenshot,
    e2e_is_capture_overlay_visible, e2e_is_main_window_visible, e2e_show_main_window,
    e2e_temp_export_path,
};

#[cfg(target_os = "windows")]
mod windows_dpi;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    windows_dpi::ensure_per_monitor_awareness();

    tauri::Builder::default()
        .manage(db::Db::default())
        .manage(cloud_auth::CloudAuth::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
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
            // A taken shortcut or a missing tray (CI sessions, minimal desktops) must not stop the app.
            if let Err(error) =
                register_capture_shortcut(app.handle(), shortcuts::DEFAULT_CAPTURE_SHORTCUT)
            {
                eprintln!("[Xcreener] could not register the capture shortcut: {error}");
            }
            if let Err(error) = tray::setup_tray(app.handle()) {
                eprintln!("[Xcreener] could not create the tray icon: {error}");
            }
            overlay::setup_overlay_window(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_handle.hide();
                    }
                });

                // WebDriver session create attaches before test hooks run. On Windows,
                // a never-shown WebView2 often never writes DevToolsActivePort.
                if std::env::var_os("TAURI_WEBVIEW_AUTOMATION").is_some() {
                    tray::show_main_window(app.handle());
                }
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
            start_region_recording_command,
            pause_region_recording_command,
            resume_region_recording_command,
            stop_region_recording_command,
            cancel_region_recording_command,
            open_path_command,
            show_live_capture_overlay,
            list_monitors_command,
            list_windows_command,
            get_window_at_point_command,
            get_capture_overlay_bounds,
            get_overlay_webview_layout,
            show_capture_overlay,
            start_capture_command,
            capture_overlay_ready,
            hide_capture_overlay,
            cancel_capture_overlay,
            detect_sensitive_data,
            recognize_text_command,
            analyze_content_command,
            compress_export_bytes_command,
            classify_content_command,
            stash_capture_image,
            take_capture_image,
            take_overlay_preview,
            take_recording_thumbnail,
            verify_entitlement,
            update_capture_shortcut,
            secure_store_get,
            secure_store_set,
            secure_store_delete,
            cloud_auth_start,
            cloud_auth_complete,
            cloud_access_token,
            cloud_sign_out,
            db_init,
            settings_get,
            settings_set,
            captures_insert,
            captures_update_ocr_text,
            captures_update_tags,
            captures_list,
            captures_search,
            captures_list_by_tag,
            captures_list_by_collection,
            captures_get,
            captures_uid_exists,
            captures_delete,
            collections_list,
            collections_create,
            collections_rename,
            collections_delete,
            collections_add_capture,
            collections_remove_capture,
            collections_for_capture,
            presets_list,
            presets_create,
            presets_delete,
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
