use objc2_app_kit::{NSApplication, NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
use objc2_foundation::MainThreadMarker;
use tauri::WebviewWindow;

fn ns_window(window: &WebviewWindow) -> Result<&NSWindow, String> {
    let handle = window.ns_window().map_err(|error| error.to_string())?;
    // SAFETY: Tauri returns the live NSWindow for this webview on the main thread.
    Ok(unsafe { &*handle.cast() })
}

/// Borderless Tauri windows reserve a title-bar inset on first show unless the
/// native window is configured for full-size content.
fn apply_overlay_window_style(ns_window: &NSWindow) {
    let mut style_mask = ns_window.styleMask();
    style_mask |= NSWindowStyleMask::NonactivatingPanel;
    style_mask |= NSWindowStyleMask::FullSizeContentView;
    ns_window.setStyleMask(style_mask);
    ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);
    ns_window.setTitlebarAppearsTransparent(true);
}

pub fn configure_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    apply_overlay_window_style(ns_window(window)?);
    Ok(())
}

pub fn set_overlay_click_through(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    ns_window(window)?.setIgnoresMouseEvents(enabled);
    Ok(())
}

/// Show the overlay without stealing the macOS menu bar from the app the user was in.
pub fn present_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    let ns_window = ns_window(window)?;
    apply_overlay_window_style(ns_window);
    ns_window.orderFrontRegardless();

    if let Some(mtm) = MainThreadMarker::new() {
        let app = NSApplication::sharedApplication(mtm);
        app.deactivate();
    }

    Ok(())
}
