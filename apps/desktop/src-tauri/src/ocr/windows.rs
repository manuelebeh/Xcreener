use image::{ImageBuffer, Rgba};
use windows::Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap};
use windows::Media::Ocr::OcrEngine as WinOcrEngine;
use windows::Storage::Streams::{DataWriter, InMemoryRandomAccessStream, IBuffer};

use super::OcrEngine;
use crate::ocr::types::TextLine;

pub struct WindowsOcrEngine;

impl OcrEngine for WindowsOcrEngine {
    fn recognize(&self, png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
        let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
        let rgba = decoded.to_rgba8();
        let (image_width, image_height) = rgba.dimensions();

        let bitmap = SoftwareBitmap::CreateCopyFromBuffer(
            &rgba_to_buffer(&rgba)?,
            BitmapPixelFormat::Rgba8,
            image_width as i32,
            image_height as i32,
        )
        .map_err(|error| error.to_string())?;

        let engine = WinOcrEngine::TryCreateFromUserProfileLanguages()
            .map_err(|error| error.to_string())?;

        let result = engine
            .RecognizeAsync(&bitmap)
            .map_err(|error| error.to_string())?
            .get()
            .map_err(|error| error.to_string())?;

        let mut lines = Vec::new();

        if let Ok(ocr_lines) = result.Lines() {
            for line in ocr_lines {
                let text = line
                    .Text()
                    .map(|value| value.to_string())
                    .unwrap_or_default();
                if text.trim().is_empty() {
                    continue;
                }

                if let Ok(words) = line.Words() {
                    if let Ok(size) = words.Size() {
                        if size > 0 {
                            if let (Ok(first), Ok(last)) =
                                (words.GetAt(0), words.GetAt(size - 1))
                            {
                                if let (Ok(first_bbox), Ok(last_bbox)) =
                                    (first.BoundingRect(), last.BoundingRect())
                                {
                                    let x = first_bbox.X as f64;
                                    let y = first_bbox.Y as f64;
                                    let width =
                                        (last_bbox.X + last_bbox.Width - first_bbox.X) as f64;
                                    let height = first_bbox.Height as f64;
                                    lines.push(TextLine {
                                        text,
                                        x,
                                        y,
                                        width,
                                        height,
                                    });
                                    continue;
                                }
                            }
                        }
                    }
                }

                lines.push(TextLine {
                    text,
                    x: 0.0,
                    y: 0.0,
                    width: image_width as f64,
                    height: 24.0,
                });
            }
        }

        Ok(lines)
    }
}

fn rgba_to_buffer(rgba: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<IBuffer, String> {
    let stream = InMemoryRandomAccessStream::new().map_err(|error| error.to_string())?;
    let writer = DataWriter::CreateDataWriter(&stream).map_err(|error| error.to_string())?;
    writer
        .WriteBytes(rgba.as_raw())
        .map_err(|error| error.to_string())?;
    writer
        .StoreAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;
    writer.DetachBuffer().map_err(|error| error.to_string())
}
