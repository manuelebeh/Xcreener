fn main() {
    #[cfg(target_os = "macos")]
    link_swift_runtime_rpath();
    tauri_build::build()
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
