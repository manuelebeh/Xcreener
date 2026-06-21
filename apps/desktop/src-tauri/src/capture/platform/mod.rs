#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
mod macos_record;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
mod windows_record;

#[cfg(target_os = "macos")]
pub(crate) use macos::{
    ensure_screen_capture_permission, focus_xcap_window, scroll_xcap_window_page_down,
    scroll_xcap_window_to_top,
};

#[cfg(target_os = "macos")]
pub(crate) use macos_record::run_region_recording as run_macos_region_recording;

#[cfg(target_os = "windows")]
pub(crate) use windows::{
    capture_monitor_image, focus_xcap_window, scroll_xcap_window_page_down,
    scroll_xcap_window_to_top,
};
