fn main() {
    #[cfg(target_os = "macos")]
    link_swift_runtime_rpath();
    embed_auth0_config();
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}

/// Every command in `generate_handler!` (`src/lib.rs`). Declaring them makes Tauri check each
/// call against the window's capability, so the capture overlay cannot reach cloud or database
/// commands. A command missing here or from a capability is refused at runtime.
const COMMANDS: &[&str] = &[
    "capture_region",
    "capture_window",
    "capture_fullscreen",
    "capture_native_command",
    "capture_scrolling_window_command",
    "cancel_live_capture_command",
    "stop_scrolling_capture_command",
    "start_region_recording_command",
    "pause_region_recording_command",
    "resume_region_recording_command",
    "stop_region_recording_command",
    "cancel_region_recording_command",
    "open_path_command",
    "show_live_capture_overlay",
    "list_monitors_command",
    "list_windows_command",
    "get_window_at_point_command",
    "get_capture_overlay_bounds",
    "get_overlay_webview_layout",
    "show_capture_overlay",
    "start_capture_command",
    "capture_overlay_ready",
    "hide_capture_overlay",
    "cancel_capture_overlay",
    "detect_sensitive_data",
    "recognize_text_command",
    "analyze_content_command",
    "compress_export_bytes_command",
    "classify_content_command",
    "stash_capture_image",
    "take_capture_image",
    "take_overlay_preview",
    "take_recording_thumbnail",
    "verify_entitlement",
    "update_capture_shortcut",
    "secure_store_get",
    "secure_store_set",
    "secure_store_delete",
    "cloud_auth_start",
    "cloud_auth_complete",
    "cloud_access_token",
    "cloud_sign_out",
    "db_init",
    "settings_get",
    "settings_set",
    "captures_insert",
    "captures_update_ocr_text",
    "captures_update_tags",
    "captures_list",
    "captures_search",
    "captures_list_by_tag",
    "captures_list_by_collection",
    "captures_get",
    "captures_uid_exists",
    "captures_delete",
    "collections_list",
    "collections_create",
    "collections_rename",
    "collections_delete",
    "collections_add_capture",
    "collections_remove_capture",
    "collections_for_capture",
    "presets_list",
    "presets_create",
    "presets_delete",
    "e2e_show_main_window",
    "e2e_emit_capture_triggered",
    "e2e_inject_screenshot",
    "e2e_temp_export_path",
    "e2e_file_metadata",
    "e2e_hide_main_window",
    "e2e_is_main_window_visible",
    "e2e_is_capture_overlay_visible",
];

/// `cloud_auth.rs` needs the same Auth0 tenant as the WebView. Values come from the process
/// environment first, then `apps/desktop/.env.local`, then `.env` (Vite's precedence).
fn embed_auth0_config() {
    const ENV_FILES: [&str; 2] = ["../.env.local", "../.env"];
    let files: Vec<String> = ENV_FILES
        .iter()
        .map(|path| {
            println!("cargo:rerun-if-changed={path}");
            std::fs::read_to_string(path).unwrap_or_default()
        })
        .collect();

    for name in ["DOMAIN", "CLIENT_ID", "AUDIENCE"] {
        let key = format!("VITE_AUTH0_{name}");
        println!("cargo:rerun-if-env-changed={key}");
        let value = std::env::var(&key)
            .ok()
            .filter(|value| !value.is_empty())
            .or_else(|| files.iter().find_map(|file| env_file_value(file, &key)));
        if let Some(value) = value {
            println!("cargo:rustc-env=SNAPGLOW_AUTH0_{name}={value}");
        }
    }
}

fn env_file_value(contents: &str, key: &str) -> Option<String> {
    contents.lines().find_map(|line| {
        let (name, value) = line.trim().split_once('=')?;
        let value = value.trim().trim_matches(|c| c == '"' || c == '\'');
        (name.trim() == key && !value.is_empty()).then(|| value.to_string())
    })
}

/// screencapturekit embeds a Swift bridge that loads `@rpath/libswift_Concurrency.dylib`.
/// Dependency `cargo:rustc-link-arg` values do not propagate to the final app binary.
#[cfg(target_os = "macos")]
fn link_swift_runtime_rpath() {
    let mut rpaths = vec!["/usr/lib/swift".to_string()];

    if let Ok(output) = std::process::Command::new("xcode-select")
        .arg("-p")
        .output()
    {
        if output.status.success() {
            let xcode_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            rpaths.push(format!(
                "{xcode_path}/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-5.5/macosx"
            ));
            rpaths.push(format!(
                "{xcode_path}/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/macosx"
            ));
        }
    }

    for rpath in rpaths {
        let flag = format!("-Wl,-rpath,{rpath}");
        println!("cargo:rustc-link-arg-bin=snapglow-desktop={flag}");
        println!("cargo:rustc-link-arg={flag}");
    }

    println!("cargo:rustc-link-arg-bin=snapglow-desktop=-Wl,-weak_framework,ScreenCaptureKit");
    println!("cargo:rustc-link-arg=-Wl,-weak_framework,ScreenCaptureKit");
}
