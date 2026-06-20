use crate::classification::preprocess::ImageStats;
use crate::classification::types::{ClassificationResult, ContentClass};

pub fn classify_from_stats(stats: &ImageStats) -> ClassificationResult {
    let start = std::time::Instant::now();

    let (content_class, confidence) = if stats.dark_ratio > 0.55 {
        if stats.mean_brightness < 0.12 {
            (ContentClass::Terminal, 0.82)
        } else {
            (ContentClass::Code, 0.78)
        }
    } else if stats.saturation > 0.35 && stats.color_variance > 0.04 {
        (ContentClass::Photo, 0.76)
    } else if stats.edge_density > 0.22 && stats.bright_ratio > 0.45 {
        (ContentClass::Ui, 0.74)
    } else if stats.edge_density > 0.18 && stats.mean_brightness > 0.75 {
        (ContentClass::Diagram, 0.72)
    } else if stats.mean_brightness > 0.55 {
        (ContentClass::Text, 0.7)
    } else {
        (ContentClass::Ui, 0.65)
    };

    ClassificationResult {
        content_class,
        confidence,
        latency_ms: start.elapsed().as_millis() as u64,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::classification::preprocess::ImageStats;

    #[test]
    fn classifies_dark_terminal_like_screenshots() {
        let result = classify_from_stats(&ImageStats {
            mean_brightness: 0.08,
            dark_ratio: 0.9,
            bright_ratio: 0.01,
            saturation: 0.05,
            color_variance: 0.01,
            edge_density: 0.1,
        });

        assert_eq!(result.content_class, ContentClass::Terminal);
        assert!(result.confidence >= 0.5);
    }
}
