pub mod types;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
mod tesseract;

use types::{RecognizeTextOptions, TextLine};

pub trait OcrEngine {
    fn recognize(&self, png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
        self.recognize_with_languages(png_bytes, &["eng".to_string()])
    }

    fn recognize_with_languages(
        &self,
        png_bytes: &[u8],
        _languages: &[String],
    ) -> Result<Vec<TextLine>, String> {
        self.recognize(png_bytes)
    }
}

#[cfg(target_os = "macos")]
fn native_engine() -> Box<dyn OcrEngine> {
    Box::new(macos::MacOcrEngine)
}

#[cfg(target_os = "windows")]
fn native_engine() -> Box<dyn OcrEngine> {
    Box::new(windows::WindowsOcrEngine)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn native_engine() -> Box<dyn OcrEngine> {
    struct UnavailableNativeEngine;

    impl OcrEngine for UnavailableNativeEngine {
        fn recognize(&self, _png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
            Err("Native OCR is only available on macOS and Windows".into())
        }
    }

    Box::new(UnavailableNativeEngine)
}

fn tesseract_engine() -> Box<dyn OcrEngine> {
    Box::new(tesseract::TesseractOcrEngine::new(resolve_tessdata_dir()))
}

fn resolve_tessdata_dir() -> Option<String> {
    if let Ok(prefix) = std::env::var("TESSDATA_PREFIX") {
        if !prefix.is_empty() {
            return Some(prefix);
        }
    }

    if let Ok(resource_dir) = std::env::var("SNAPGLOW_TESSDATA_DIR") {
        if !resource_dir.is_empty() {
            return Some(resource_dir);
        }
    }

    None
}

fn needs_tesseract_for_languages(languages: &[String]) -> bool {
    languages.iter().any(|language| {
        let code = language.to_lowercase();
        code == "deu" || code == "jpn" || code == "ger"
    })
}

pub fn recognize_text_with_options(
    png_bytes: &[u8],
    options: &RecognizeTextOptions,
) -> Result<Vec<TextLine>, String> {
    let engine_mode = options.engine.to_lowercase();

    if engine_mode == "tesseract" {
        return tesseract_engine().recognize_with_languages(png_bytes, &options.languages);
    }

    if engine_mode == "native" {
        return native_engine().recognize_with_languages(png_bytes, &options.languages);
    }

    // auto: native first on macOS/Windows unless explicit DE/JP languages
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        if !needs_tesseract_for_languages(&options.languages) {
            let native = native_engine().recognize_with_languages(png_bytes, &options.languages);
            if matches!(&native, Ok(lines) if !lines.is_empty()) {
                return native;
            }
            // Tesseract is an optional extra: when it is missing or fails, keep the
            // native answer (no text, or the native error) instead of its error.
            return tesseract_engine()
                .recognize_with_languages(png_bytes, &options.languages)
                .or(native);
        }
    }

    tesseract_engine().recognize_with_languages(png_bytes, &options.languages)
}

pub fn recognize_text(png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
    recognize_text_with_options(png_bytes, &RecognizeTextOptions::default())
}
