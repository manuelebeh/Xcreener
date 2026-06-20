#[cfg(target_os = "macos")]
mod coreml;
mod heuristic;
mod preprocess;
mod tflite;
mod types;

pub use types::ClassificationResult;

const MAX_DIMENSION: u32 = 2048;

pub fn classify_content(png_bytes: &[u8]) -> Result<ClassificationResult, String> {
    let image = preprocess::decode_png(png_bytes)?;
    let scaled = preprocess::downscale_if_needed(image, MAX_DIMENSION);

    if let Some(result) = try_model_inference(&scaled) {
        return Ok(result);
    }

    let stats = preprocess::compute_stats(&scaled);
    Ok(heuristic::classify_from_stats(&stats))
}

fn try_model_inference(image: &image::DynamicImage) -> Option<ClassificationResult> {
    #[cfg(target_os = "macos")]
    {
        if let Some(result) = coreml::classify(image) {
            return Some(result);
        }
    }

    tflite::classify(image)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_png_bytes_under_latency_budget() {
        let image = image::RgbaImage::from_pixel(320, 240, image::Rgba([20, 24, 28, 255]));
        let mut buffer = Vec::new();
        image
            .write_to(
                &mut std::io::Cursor::new(&mut buffer),
                image::ImageFormat::Png,
            )
            .expect("encode png");

        let result = classify_content(&buffer).expect("classify png");
        assert!(result.confidence >= 0.5);
        assert!(result.latency_ms < 500);
    }

    #[test]
    fn serializes_classification_result_for_ipc() {
        use crate::classification::types::ContentClass;

        let result = ClassificationResult {
            content_class: ContentClass::Code,
            confidence: 0.91,
            latency_ms: 12,
        };

        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("\"class\":\"code\""));
        assert!(json.contains("\"confidence\":0.91"));
        assert!(json.contains("\"latencyMs\":12"));
    }
}
