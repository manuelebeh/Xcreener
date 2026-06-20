use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, RgbaImage};

pub const INPUT_SIZE: u32 = 224;

const IMAGENET_MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [f32; 3] = [0.229, 0.224, 0.225];

pub struct ImageStats {
    pub mean_brightness: f32,
    pub dark_ratio: f32,
    pub bright_ratio: f32,
    pub saturation: f32,
    pub color_variance: f32,
    pub edge_density: f32,
}

pub fn decode_png(png_bytes: &[u8]) -> Result<DynamicImage, String> {
    image::load_from_memory(png_bytes).map_err(|error| error.to_string())
}

pub fn downscale_if_needed(image: DynamicImage, max_dimension: u32) -> DynamicImage {
    let (width, height) = image.dimensions();
    let largest = width.max(height);

    if largest <= max_dimension {
        return image;
    }

    let scale = max_dimension as f32 / largest as f32;
    let new_width = (width as f32 * scale).round().max(1.0) as u32;
    let new_height = (height as f32 * scale).round().max(1.0) as u32;
    image.resize(new_width, new_height, FilterType::Triangle)
}

pub fn compute_stats(image: &DynamicImage) -> ImageStats {
    let rgba = image.to_rgba8();
    analyze_rgba(&rgba)
}

pub fn to_model_input(image: &DynamicImage) -> Vec<f32> {
    let resized = image.resize_exact(INPUT_SIZE, INPUT_SIZE, FilterType::Triangle);
    let rgba = resized.to_rgba8();
    let mut tensor = Vec::with_capacity((INPUT_SIZE * INPUT_SIZE * 3) as usize);

    for pixel in rgba.pixels() {
        let r = pixel[0] as f32 / 255.0;
        let g = pixel[1] as f32 / 255.0;
        let b = pixel[2] as f32 / 255.0;
        tensor.push((r - IMAGENET_MEAN[0]) / IMAGENET_STD[0]);
        tensor.push((g - IMAGENET_MEAN[1]) / IMAGENET_STD[1]);
        tensor.push((b - IMAGENET_MEAN[2]) / IMAGENET_STD[2]);
    }

    tensor
}

fn analyze_rgba(rgba: &RgbaImage) -> ImageStats {
    let mut brightness_sum = 0.0f32;
    let mut dark_count = 0u32;
    let mut bright_count = 0u32;
    let mut saturation_sum = 0.0f32;
    let mut r_sum = 0.0f32;
    let mut g_sum = 0.0f32;
    let mut b_sum = 0.0f32;
    let mut edge_count = 0u32;
    let width = rgba.width();
    let height = rgba.height();
    let pixel_count = (width * height).max(1) as f32;

    for pixel in rgba.pixels() {
        let r = pixel[0] as f32 / 255.0;
        let g = pixel[1] as f32 / 255.0;
        let b = pixel[2] as f32 / 255.0;
        let brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        brightness_sum += brightness;

        if brightness < 0.2 {
            dark_count += 1;
        }
        if brightness > 0.8 {
            bright_count += 1;
        }

        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        saturation_sum += if max <= 0.001 {
            0.0
        } else {
            (max - min) / max
        };

        r_sum += r;
        g_sum += g;
        b_sum += b;
    }

    let mean_r = r_sum / pixel_count;
    let mean_g = g_sum / pixel_count;
    let mean_b = b_sum / pixel_count;

    let mut variance_sum = 0.0f32;
    for pixel in rgba.pixels() {
        let r = pixel[0] as f32 / 255.0;
        let g = pixel[1] as f32 / 255.0;
        let b = pixel[2] as f32 / 255.0;
        variance_sum += (r - mean_r).powi(2) + (g - mean_g).powi(2) + (b - mean_b).powi(2);
    }

    if width > 1 && height > 1 {
        for y in 0..height - 1 {
            for x in 0..width - 1 {
                let current = rgba.get_pixel(x, y);
                let right = rgba.get_pixel(x + 1, y);
                let down = rgba.get_pixel(x, y + 1);
                let current_brightness = luminance(current);
                let right_brightness = luminance(right);
                let down_brightness = luminance(down);

                if (current_brightness - right_brightness).abs() > 0.08
                    || (current_brightness - down_brightness).abs() > 0.08
                {
                    edge_count += 1;
                }
            }
        }
    }

    let edge_samples = ((width.saturating_sub(1) * height.saturating_sub(1)).max(1)) as f32;

    ImageStats {
        mean_brightness: brightness_sum / pixel_count,
        dark_ratio: dark_count as f32 / pixel_count,
        bright_ratio: bright_count as f32 / pixel_count,
        saturation: saturation_sum / pixel_count,
        color_variance: variance_sum / pixel_count,
        edge_density: edge_count as f32 / edge_samples,
    }
}

fn luminance(pixel: &image::Rgba<u8>) -> f32 {
    let r = pixel[0] as f32 / 255.0;
    let g = pixel[1] as f32 / 255.0;
    let b = pixel[2] as f32 / 255.0;
    0.2126 * r + 0.7152 * g + 0.0722 * b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_png_bytes() {
        let image = image::RgbaImage::from_pixel(4, 4, image::Rgba([10, 10, 10, 255]));
        let mut buffer = Vec::new();
        image
            .write_to(
                &mut std::io::Cursor::new(&mut buffer),
                image::ImageFormat::Png,
            )
            .expect("encode png");

        let decoded = decode_png(&buffer).expect("decode png");
        assert_eq!(decoded.dimensions(), (4, 4));
    }
}
