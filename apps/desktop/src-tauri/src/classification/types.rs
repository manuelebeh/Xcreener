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
    pub const MODEL_LABELS: [&'static str; 6] =
        ["code", "ui", "terminal", "photo", "diagram", "text"];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Code => Self::MODEL_LABELS[0],
            Self::Ui => Self::MODEL_LABELS[1],
            Self::Terminal => Self::MODEL_LABELS[2],
            Self::Photo => Self::MODEL_LABELS[3],
            Self::Diagram => Self::MODEL_LABELS[4],
            Self::Text => Self::MODEL_LABELS[5],
        }
    }

    pub fn from_label(label: &str) -> Self {
        for class in [
            Self::Code,
            Self::Ui,
            Self::Terminal,
            Self::Photo,
            Self::Diagram,
            Self::Text,
        ] {
            if class.as_str() == label {
                return class;
            }
        }
        Self::Ui
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_labels_match_serde_names() {
        let classes = [
            ContentClass::Code,
            ContentClass::Ui,
            ContentClass::Terminal,
            ContentClass::Photo,
            ContentClass::Diagram,
            ContentClass::Text,
        ];

        for class in classes {
            assert_eq!(ContentClass::from_label(class.as_str()), class);
        }

        assert_eq!(ContentClass::MODEL_LABELS.len(), classes.len());
    }
}
