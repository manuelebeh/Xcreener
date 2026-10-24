fn main() {
    #[cfg(target_os = "macos")]
    link_swift_runtime_rpath();
    embed_auth0_config();
    tauri_build::build()
}

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

    if let Ok(output) = std::process::Command::new("xcode-select").arg("-p").output() {
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
