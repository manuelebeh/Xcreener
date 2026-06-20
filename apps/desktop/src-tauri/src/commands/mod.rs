mod capture;
mod classification;
mod export;
mod image_processing;
mod ocr;
mod overlay_layout;
mod redaction;
mod storage;

pub use capture::{
    cancel_capture_overlay, capture_fullscreen, capture_overlay_ready, capture_region,
    capture_window, get_capture_overlay_bounds, get_window_at_point_command,
    hide_capture_overlay, list_monitors_command, list_windows_command, show_capture_overlay,
};
pub use classification::classify_content_command;
pub use export::export_image;
pub use image_processing::{
    compress_export_bytes_command, crop_image_command, detect_content_bounds_command,
};
pub use ocr::recognize_text_command;
pub use overlay_layout::get_overlay_webview_layout;
pub use redaction::detect_sensitive_data;
pub use storage::{get_setting, set_setting};
