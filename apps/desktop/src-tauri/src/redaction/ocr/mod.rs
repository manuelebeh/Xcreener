use crate::redaction::types::TextLine;

pub trait OcrEngine {
    fn recognize(&self, png_bytes: &[u8]) -> Result<Vec<TextLine>, String>;
}

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod stub;

#[cfg(target_os = "macos")]
pub fn default_engine() -> Box<dyn OcrEngine> {
    Box::new(macos::MacOcrEngine)
}

#[cfg(target_os = "windows")]
pub fn default_engine() -> Box<dyn OcrEngine> {
    Box::new(windows::WindowsOcrEngine)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn default_engine() -> Box<dyn OcrEngine> {
    Box::new(stub::StubOcrEngine)
}

pub fn recognize_text(png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
    default_engine().recognize(png_bytes)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod stub {
    use super::{OcrEngine, TextLine};

    pub struct StubOcrEngine;

    impl OcrEngine for StubOcrEngine {
        fn recognize(&self, _png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
            Err("OCR is only available on macOS and Windows".into())
        }
    }
}
