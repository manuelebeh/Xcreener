use crate::redaction::detectors;
use crate::redaction::ocr;
use crate::redaction::types::SensitiveRegion;

pub fn detect_sensitive_regions(png_bytes: &[u8]) -> Result<Vec<SensitiveRegion>, String> {
    let lines = ocr::recognize_text(png_bytes)?;
    Ok(detectors::detect_in_lines(&lines))
}
