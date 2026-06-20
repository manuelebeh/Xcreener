use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentClass {
    Code,
    Ui,
    Terminal,
    Photo,
    Diagram,
    Text,
}

impl ContentClass {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Code => "code",
            Self::Ui => "ui",
            Self::Terminal => "terminal",
            Self::Photo => "photo",
            Self::Diagram => "diagram",
            Self::Text => "text",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationResult {
    #[serde(rename = "class")]
    pub content_class: ContentClass,
    pub confidence: f32,
    pub latency_ms: u64,
}
