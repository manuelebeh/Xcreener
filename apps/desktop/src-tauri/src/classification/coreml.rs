use crate::classification::tflite;
use crate::classification::types::ClassificationResult;

pub fn classify(image: &image::DynamicImage) -> Option<ClassificationResult> {
    if tflite::is_model_available() {
        return tflite::classify(image);
    }

    let _ = (image, model_path());
    None
}

pub fn model_path() -> std::path::PathBuf {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources/models/content_classifier.mlmodel")
}
