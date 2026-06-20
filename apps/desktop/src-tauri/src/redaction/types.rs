use serde::{Deserialize, Serialize};

pub use crate::ocr::types::TextLine;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SensitiveRegion {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub kind: String,
}
