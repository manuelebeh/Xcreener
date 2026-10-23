use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TextLine {
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ContentBounds {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ContentAnalysis {
    /// Tight box around everything that differs from the background.
    pub bounds: ContentBounds,
    /// RGBA background color sampled from the four corners.
    pub background: [u8; 4],
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecognizeTextOptions {
    #[serde(default = "default_engine_mode")]
    pub engine: String,
    #[serde(default = "default_languages")]
    pub languages: Vec<String>,
}

fn default_engine_mode() -> String {
    "auto".into()
}

fn default_languages() -> Vec<String> {
    vec!["eng".into()]
}
