use image::{Rgba, RgbaImage};

use crate::ocr::types::ContentBounds;

const DEFAULT_TOLERANCE: u8 = 18;
const SAFETY_MARGIN: u32 = 2;
const MIN_CONTENT_RATIO: f64 = 0.05;

pub fn detect_content_bounds(png_bytes: &[u8]) -> Result<ContentBounds, String> {
    let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
    let rgba = decoded.to_rgba8();
    let (width, height) = rgba.dimensions();

    if width == 0 || height == 0 {
        return Err("Image has zero dimensions".into());
    }

    let background = estimate_background_color(&rgba, width, height);
    let tolerance = DEFAULT_TOLERANCE;

    let mut top = 0;
    while top < height && row_is_empty(&rgba, width, top, background, tolerance) {
        top += 1;
    }

    let mut bottom = height.saturating_sub(1);
    while bottom > top && row_is_empty(&rgba, width, bottom, background, tolerance) {
        bottom -= 1;
    }

    let mut left = 0;
    while left < width && column_is_empty(&rgba, height, left, top, bottom, background, tolerance) {
        left += 1;
    }

    let mut right = width.saturating_sub(1);
    while right > left
        && column_is_empty(&rgba, height, right, top, bottom, background, tolerance)
    {
        right -= 1;
    }

    let crop_x = left.saturating_sub(SAFETY_MARGIN);
    let crop_y = top.saturating_sub(SAFETY_MARGIN);
    let crop_right = (right + 1 + SAFETY_MARGIN).min(width);
    let crop_bottom = (bottom + 1 + SAFETY_MARGIN).min(height);
    let crop_width = crop_right.saturating_sub(crop_x);
    let crop_height = crop_bottom.saturating_sub(crop_y);

    if crop_width == 0 || crop_height == 0 {
        return Err("No content detected in image".into());
    }

    let original_area = (width as f64) * (height as f64);
    let crop_area = (crop_width as f64) * (crop_height as f64);
    if crop_area / original_area > 0.95 {
        return Err("Auto-crop would remove less than 5% of the image".into());
    }

    if crop_area / original_area < MIN_CONTENT_RATIO {
        return Err("Detected content bounds are too small".into());
    }

    Ok(ContentBounds {
        x: crop_x,
        y: crop_y,
        width: crop_width,
        height: crop_height,
    })
}

pub fn crop_image(png_bytes: &[u8], bounds: &ContentBounds) -> Result<Vec<u8>, String> {
    let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
    let cropped = decoded
        .crop_imm(bounds.x, bounds.y, bounds.width, bounds.height)
        .to_rgba8();

    let mut buffer = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buffer);
    cropped
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(buffer)
}

fn estimate_background_color(rgba: &RgbaImage, width: u32, height: u32) -> Rgba<u8> {
    let samples = [
        rgba.get_pixel(0, 0),
        rgba.get_pixel(width - 1, 0),
        rgba.get_pixel(0, height - 1),
        rgba.get_pixel(width - 1, height - 1),
        rgba.get_pixel(width / 2, 0),
        rgba.get_pixel(width / 2, height - 1),
        rgba.get_pixel(0, height / 2),
        rgba.get_pixel(width - 1, height / 2),
    ];

    let mut r = 0u32;
    let mut g = 0u32;
    let mut b = 0u32;
    let mut a = 0u32;

    for pixel in samples {
        r += pixel[0] as u32;
        g += pixel[1] as u32;
        b += pixel[2] as u32;
        a += pixel[3] as u32;
    }

    let count = samples.len() as u32;
    Rgba([
        (r / count) as u8,
        (g / count) as u8,
        (b / count) as u8,
        (a / count) as u8,
    ])
}

fn row_is_empty(
    rgba: &RgbaImage,
    width: u32,
    y: u32,
    background: Rgba<u8>,
    tolerance: u8,
) -> bool {
    for x in 0..width {
        if !pixel_matches_background(rgba.get_pixel(x, y), background, tolerance) {
            return false;
        }
    }
    true
}

fn column_is_empty(
    rgba: &RgbaImage,
    _height: u32,
    x: u32,
    top: u32,
    bottom: u32,
    background: Rgba<u8>,
    tolerance: u8,
) -> bool {
    for y in top..=bottom {
        if !pixel_matches_background(rgba.get_pixel(x, y), background, tolerance) {
            return false;
        }
    }
    true
}

fn pixel_matches_background(pixel: &Rgba<u8>, background: Rgba<u8>, tolerance: u8) -> bool {
    if pixel[3] <= 8 {
        return true;
    }

    color_distance(*pixel, background) <= tolerance
}

fn color_distance(a: Rgba<u8>, b: Rgba<u8>) -> u8 {
    let dr = a[0].abs_diff(b[0]);
    let dg = a[1].abs_diff(b[1]);
    let db = a[2].abs_diff(b[2]);
    dr.max(dg).max(db)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn png_from_rgba(rgba: RgbaImage) -> Vec<u8> {
        let mut buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut buffer);
        rgba.write_to(&mut cursor, image::ImageFormat::Png)
            .expect("encode png");
        buffer
    }

    #[test]
    fn trims_uniform_margins() {
        let mut rgba = RgbaImage::from_pixel(120, 80, Rgba([255, 255, 255, 255]));
        for y in 20..60 {
            for x in 30..90 {
                rgba.put_pixel(x, y, Rgba([20, 20, 20, 255]));
            }
        }

        let bounds = detect_content_bounds(&png_from_rgba(rgba)).expect("detect bounds");
        assert!(bounds.x >= 18);
        assert!(bounds.y >= 18);
        assert!(bounds.width <= 80);
        assert!(bounds.height <= 50);
    }

    #[test]
    fn rejects_full_frame_content() {
        let rgba = RgbaImage::from_pixel(40, 40, Rgba([10, 10, 10, 255]));
        let error = detect_content_bounds(&png_from_rgba(rgba)).expect_err("should reject");
        assert!(
            error.contains("5%")
                || error.contains("No content detected")
                || error.contains("too small"),
            "unexpected error: {error}"
        );
    }
}
