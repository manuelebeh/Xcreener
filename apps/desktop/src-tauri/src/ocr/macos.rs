use std::sync::Mutex;

use image::GenericImageView;
use objc2::AnyThread;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2_foundation::{NSArray, NSData, NSDictionary};
use objc2_vision::{
    VNImageRequestHandler, VNRecognizeTextRequest, VNRequest, VNRequestTextRecognitionLevel,
};

use super::OcrEngine;
use crate::ocr::types::TextLine;

pub struct MacOcrEngine;

/// Vision fails with CRImageReaderError 1 when text requests on different images
/// overlap (e.g. two editor scans), so each whole request runs under this lock.
static VISION_LOCK: Mutex<()> = Mutex::new(());

impl OcrEngine for MacOcrEngine {
    fn recognize(&self, png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
        let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
        let (image_width, image_height) = decoded.dimensions();

        let _guard = VISION_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let data = NSData::with_bytes(png_bytes);
        let options = NSDictionary::<objc2_vision::VNImageOption, AnyObject>::new();
        let handler = VNImageRequestHandler::initWithData_options(
            VNImageRequestHandler::alloc(),
            &data,
            &options,
        );

        let request = VNRecognizeTextRequest::new();
        request.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);

        let request_super: Retained<VNRequest> = request.clone().into_super().into_super();
        let requests = NSArray::from_retained_slice(&[request_super]);

        handler
            .performRequests_error(&requests)
            .map_err(|error| error.localizedDescription().to_string())?;

        let observations = request.results();
        let Some(observations) = observations else {
            return Ok(Vec::new());
        };

        let mut lines = Vec::new();

        for observation in observations.iter() {
            let candidates = observation.topCandidates(1);
            let Some(candidate) = candidates.iter().next() else {
                continue;
            };

            let text = candidate.string().to_string();
            if text.trim().is_empty() {
                continue;
            }

            let bounds = unsafe {
                observation
                    .into_super()
                    .into_super()
                    .boundingBox()
            };
            let width = bounds.size.width * image_width as f64;
            let height = bounds.size.height * image_height as f64;
            let x = bounds.origin.x * image_width as f64;
            let y = (1.0 - bounds.origin.y - bounds.size.height) * image_height as f64;

            lines.push(TextLine {
                text,
                x,
                y,
                width,
                height,
            });
        }

        Ok(lines)
    }
}
