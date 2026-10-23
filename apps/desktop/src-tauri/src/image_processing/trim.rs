use image::{Rgba, RgbaImage};

use crate::ocr::types::{ContentAnalysis, ContentBounds};

const DEFAULT_TOLERANCE: u8 = 18;
/// Smaller clusters of non-background pixels are noise (cursor remnants, specks), not content.
const MIN_COMPONENT_PIXELS: usize = 24;

pub fn analyze_content(png_bytes: &[u8]) -> Result<ContentAnalysis, String> {
    let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
    let rgba = decoded.to_rgba8();
    let (width, height) = rgba.dimensions();

    if width == 0 || height == 0 {
        return Err("Image has zero dimensions".into());
    }

    let tolerance = DEFAULT_TOLERANCE;
    let background = estimate_background_color(&rgba, width, height, tolerance)
        .ok_or_else(|| String::from("Background is not a uniform color"))?;

    let bounds = content_bounds(&rgba, background, tolerance)
        .ok_or_else(|| String::from("No content detected in image"))?;

    Ok(ContentAnalysis {
        bounds,
        background: background.0,
    })
}

/// Bounding box of every 8-connected cluster of non-background pixels that is
/// at least MIN_COMPONENT_PIXELS large.
fn content_bounds(rgba: &RgbaImage, background: Rgba<u8>, tolerance: u8) -> Option<ContentBounds> {
    let (width, height) = rgba.dimensions();
    let is_content =
        |x: u32, y: u32| !pixel_matches_background(rgba.get_pixel(x, y), background, tolerance);

    let mut visited = vec![false; width as usize * height as usize];
    let mut stack = Vec::new();
    let mut bounds: Option<(u32, u32, u32, u32)> = None;

    for y in 0..height {
        for x in 0..width {
            let index = (y * width + x) as usize;
            if visited[index] || !is_content(x, y) {
                continue;
            }

            visited[index] = true;
            stack.push((x, y));
            let (mut left, mut top, mut right, mut bottom) = (x, y, x, y);
            let mut count = 0;

            while let Some((cx, cy)) = stack.pop() {
                count += 1;
                left = left.min(cx);
                top = top.min(cy);
                right = right.max(cx);
                bottom = bottom.max(cy);

                for ny in cy.saturating_sub(1)..=(cy + 1).min(height - 1) {
                    for nx in cx.saturating_sub(1)..=(cx + 1).min(width - 1) {
                        let neighbor = (ny * width + nx) as usize;
                        if !visited[neighbor] && is_content(nx, ny) {
                            visited[neighbor] = true;
                            stack.push((nx, ny));
                        }
                    }
                }
            }

            if count >= MIN_COMPONENT_PIXELS {
                bounds = Some(match bounds {
                    None => (left, top, right, bottom),
                    Some((l, t, r, b)) => (l.min(left), t.min(top), r.max(right), b.max(bottom)),
                });
            }
        }
    }

    bounds.map(|(left, top, right, bottom)| ContentBounds {
        x: left,
        y: top,
        width: right + 1 - left,
        height: bottom + 1 - top,
    })
}

/// Averages the four corners. Returns None when they disagree, since balancing
/// only makes sense on a flat background.
fn estimate_background_color(
    rgba: &RgbaImage,
    width: u32,
    height: u32,
    tolerance: u8,
) -> Option<Rgba<u8>> {
    let corners = [
        *rgba.get_pixel(0, 0),
        *rgba.get_pixel(width - 1, 0),
        *rgba.get_pixel(0, height - 1),
        *rgba.get_pixel(width - 1, height - 1),
    ];

    let mut sum = [0u32; 4];
    for pixel in corners {
        for (channel, value) in sum.iter_mut().zip(pixel.0) {
            *channel += value as u32;
        }
    }

    let count = corners.len() as u32;
    let average = Rgba(sum.map(|channel| (channel / count) as u8));

    corners
        .iter()
        .all(|corner| pixel_matches_background(corner, average, tolerance))
        .then_some(average)
}

fn pixel_matches_background(pixel: &Rgba<u8>, background: Rgba<u8>, tolerance: u8) -> bool {
    if pixel[3] <= 8 && background[3] <= 8 {
        return true;
    }

    color_distance(*pixel, background) <= tolerance
}

fn color_distance(a: Rgba<u8>, b: Rgba<u8>) -> u8 {
    let dr = a[0].abs_diff(b[0]);
    let dg = a[1].abs_diff(b[1]);
    let db = a[2].abs_diff(b[2]);
    let da = a[3].abs_diff(b[3]);
    dr.max(dg).max(db).max(da)
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
    fn finds_tight_bounds_and_background() {
        let mut rgba = RgbaImage::from_pixel(120, 80, Rgba([250, 250, 250, 255]));
        for y in 20..60 {
            for x in 30..90 {
                rgba.put_pixel(x, y, Rgba([20, 20, 20, 255]));
            }
        }

        let analysis = analyze_content(&png_from_rgba(rgba)).expect("analyze");
        assert_eq!(
            analysis.bounds,
            ContentBounds {
                x: 30,
                y: 20,
                width: 60,
                height: 40
            }
        );
        assert_eq!(analysis.background, [250, 250, 250, 255]);
    }

    #[test]
    fn ignores_content_touching_an_edge_midpoint() {
        let mut rgba = RgbaImage::from_pixel(100, 100, Rgba([255, 255, 255, 255]));
        for y in 40..60 {
            for x in 0..50 {
                rgba.put_pixel(x, y, Rgba([0, 0, 0, 255]));
            }
        }

        let analysis = analyze_content(&png_from_rgba(rgba)).expect("analyze");
        assert_eq!(analysis.bounds.x, 0);
        assert_eq!(analysis.bounds.width, 50);
    }

    #[test]
    fn ignores_small_specks() {
        let mut rgba = RgbaImage::from_pixel(200, 100, Rgba([254, 254, 254, 255]));
        for y in 20..60 {
            for x in 30..90 {
                rgba.put_pixel(x, y, Rgba([20, 20, 20, 255]));
            }
        }
        // Faint 2x4 mark touching the bottom edge, like a cursor remnant.
        for y in 96..100 {
            for x in 150..152 {
                rgba.put_pixel(x, y, Rgba([230, 230, 230, 255]));
            }
        }

        let analysis = analyze_content(&png_from_rgba(rgba)).expect("analyze");
        assert_eq!(
            analysis.bounds,
            ContentBounds {
                x: 30,
                y: 20,
                width: 60,
                height: 40
            }
        );
    }

    #[test]
    fn rejects_blank_image() {
        let rgba = RgbaImage::from_pixel(40, 40, Rgba([10, 10, 10, 255]));
        let error = analyze_content(&png_from_rgba(rgba)).expect_err("should reject");
        assert!(error.contains("No content"), "unexpected error: {error}");
    }

    #[test]
    fn rejects_non_uniform_background() {
        let mut rgba = RgbaImage::from_pixel(40, 40, Rgba([255, 255, 255, 255]));
        rgba.put_pixel(39, 39, Rgba([0, 0, 0, 255]));
        let error = analyze_content(&png_from_rgba(rgba)).expect_err("should reject");
        assert!(error.contains("uniform"), "unexpected error: {error}");
    }
}
