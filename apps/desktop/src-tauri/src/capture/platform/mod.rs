#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
pub(crate) use macos::ensure_screen_capture_permission;

#[cfg(target_os = "windows")]
pub(crate) use windows::capture_monitor_image;
