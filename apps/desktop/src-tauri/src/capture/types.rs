use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayWebviewLayout {
    pub scale_factor: f64,
    pub inner_width: f64,
    pub inner_height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureOverlayInitPayload {
    pub bounds: CaptureOverlayBounds,
    pub monitors: Vec<MonitorInfo>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preview_png: Option<Vec<u8>>,
    #[serde(default)]
    pub live_overlay: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webview_layout: Option<OverlayWebviewLayout>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub id: u64,
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureNativeRequest {
    pub kind: String,
    #[serde(default)]
    pub rect: Option<Rect>,
    #[serde(default)]
    pub window_id: Option<u64>,
    #[serde(default)]
    pub monitor_id: Option<u32>,
    pub delay_secs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureProgressPayload {
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_secs: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elapsed_secs: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_duration_secs: Option<u32>,
}

impl CaptureProgressPayload {
    pub fn with_phase(phase: impl Into<String>) -> Self {
        Self {
            phase: phase.into(),
            remaining_secs: None,
            current: None,
            total: None,
            elapsed_secs: None,
            paused: None,
            frame_count: None,
            max_duration_secs: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRecordStartRequest {
    pub rect: Rect,
    #[serde(default = "default_record_output_format")]
    pub output_format: String,
    #[serde(default = "default_max_duration_secs")]
    pub max_duration_secs: u32,
    /// GIF quality preset selected in the UI ("low" | "medium" | "high"). Ignored for MP4.
    #[serde(default = "default_gif_quality")]
    pub gif_quality: String,
}

fn default_record_output_format() -> String {
    "gif".into()
}

fn default_gif_quality() -> String {
    "medium".into()
}

fn default_max_duration_secs() -> u32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRecordingCompletePayload {
    pub file_path: String,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub duration_ms: u32,
    pub file_size: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail_png: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureErrorPayload {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureOverlayBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}
