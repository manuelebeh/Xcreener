use std::path::PathBuf;
use std::sync::OnceLock;

use tract_tflite::prelude::*;

use crate::classification::preprocess::{self, INPUT_SIZE};
use crate::classification::types::{ClassificationResult, ContentClass};

type RunnableClassifier = RunnableModel<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>;

static MODEL: OnceLock<Option<RunnableClassifier>> = OnceLock::new();

pub fn model_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/models/content_classifier.tflite")
}

pub fn is_model_available() -> bool {
    model_path().is_file()
}

fn load_model() -> Option<RunnableClassifier> {
    if !is_model_available() {
        return None;
    }

    let path = model_path();
    tract_tflite::tflite()
        .model_for_path(&path)
        .ok()?
        .into_optimized()
        .ok()?
        .into_runnable()
        .ok()
}

fn get_model() -> Option<&'static RunnableClassifier> {
    MODEL.get_or_init(load_model).as_ref()
}

pub fn classify(image: &image::DynamicImage) -> Option<ClassificationResult> {
    let model = get_model()?;
    let start = std::time::Instant::now();
    let input_values = preprocess::to_model_input(image);
    let input = Tensor::from_shape(&[1, INPUT_SIZE as usize, INPUT_SIZE as usize, 3], &input_values).ok()?;
    let outputs = model.run(tvec!(input.into())).ok()?;
    let logits = outputs[0].to_array_view::<f32>().ok()?;
    let scores: Vec<f32> = logits.iter().copied().collect();
    let probabilities = softmax(&scores);

    let (best_index, confidence) = probabilities
        .iter()
        .enumerate()
        .max_by(|(_, left), (_, right)| left.partial_cmp(right).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(index, confidence)| (index, *confidence))?;

    let label = ContentClass::MODEL_LABELS
        .get(best_index)
        .copied()
        .unwrap_or("ui");

    Some(ClassificationResult {
        content_class: ContentClass::from_label(label),
        confidence,
        latency_ms: start.elapsed().as_millis() as u64,
    })
}

fn softmax(values: &[f32]) -> Vec<f32> {
    if values.is_empty() {
        return Vec::new();
    }

    let max = values.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    let exp_sum: f32 = values.iter().map(|value| (value - max).exp()).sum();
    values
        .iter()
        .map(|value| (value - max).exp() / exp_sum)
        .collect()
}
