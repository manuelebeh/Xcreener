use image::codecs::jpeg::JpegEncoder;
use imagequant::{Attributes, RGBA};

pub fn compress_export_bytes(
    image_data: Vec<u8>,
    format: &str,
    quality: u8,
) -> Result<Vec<u8>, String> {
    let normalized = format.to_lowercase();
    match normalized.as_str() {
        "png" => compress_png(image_data),
        "jpg" | "jpeg" => compress_jpeg(image_data, quality),
        "webp" => compress_webp(image_data, quality),
        _ => Err(format!("Unsupported export format: {format}")),
    }
}

fn compress_png(image_data: Vec<u8>) -> Result<Vec<u8>, String> {
    let decoded = image::load_from_memory(&image_data).map_err(|error| error.to_string())?;
    let rgba = decoded.to_rgba8();
    let (width, height) = rgba.dimensions();

    let rgba_pixels: Vec<RGBA> = rgba
        .pixels()
        .map(|pixel| RGBA::new(pixel[0], pixel[1], pixel[2], pixel[3]))
        .collect();

    let mut attributes = Attributes::new();
    attributes
        .set_quality(60, 90)
        .map_err(|error| error.to_string())?;
    attributes
        .set_speed(3)
        .map_err(|error| error.to_string())?;

    let mut image = attributes
        .new_image(
            &rgba_pixels[..],
            width as usize,
            height as usize,
            0.0,
        )
        .map_err(|error| error.to_string())?;

    let mut quantization = attributes
        .quantize(&mut image)
        .map_err(|error| error.to_string())?;

    quantization
        .set_dithering_level(1.0)
        .map_err(|error| error.to_string())?;

    let (palette, pixels) = quantization
        .remapped(&mut image)
        .map_err(|error| error.to_string())?;

    let mut buffer = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buffer);
    let mut encoder = png::Encoder::new(&mut cursor, width, height);
    encoder.set_color(png::ColorType::Indexed);
    encoder.set_depth(png::BitDepth::Eight);
    let palette_bytes: Vec<u8> = palette
        .iter()
        .flat_map(|color| [color.r, color.g, color.b])
        .collect();
    let alpha_bytes: Vec<u8> = palette.iter().map(|color| color.a).collect();
    encoder.set_palette(&palette_bytes);
    encoder.set_trns(&alpha_bytes);

    let mut writer = encoder.write_header().map_err(|error| error.to_string())?;
    let indexed: Vec<u8> = pixels.iter().map(|index| *index as u8).collect();
    writer
        .write_image_data(&indexed)
        .map_err(|error| error.to_string())?;
    drop(writer);
    drop(cursor);

    Ok(buffer)
}

fn compress_jpeg(image_data: Vec<u8>, quality: u8) -> Result<Vec<u8>, String> {
    let decoded = image::load_from_memory(&image_data).map_err(|error| error.to_string())?;
    let rgb = decoded.to_rgb8();

    let mut buffer = Vec::new();
    let quality = quality.clamp(50, 100);
    let mut encoder = JpegEncoder::new_with_quality(&mut buffer, quality);
    encoder
        .encode(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|error| error.to_string())?;

    Ok(buffer)
}

fn compress_webp(image_data: Vec<u8>, quality: u8) -> Result<Vec<u8>, String> {
    let decoded = image::load_from_memory(&image_data).map_err(|error| error.to_string())?;
    let rgba = decoded.to_rgba8();
    let quality = quality.clamp(50, 100) as f32;

    let encoded = webp::Encoder::from_rgba(rgba.as_raw(), rgba.width(), rgba.height())
        .encode(quality);

    Ok(encoded.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgba, RgbaImage};

    fn sample_png() -> Vec<u8> {
        let mut rgba = RgbaImage::from_pixel(800, 600, Rgba([245, 245, 245, 255]));
        for y in 80..520 {
            for x in 120..680 {
                rgba.put_pixel(x, y, Rgba([30, 120, 220, 255]));
            }
        }
        let mut buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut buffer);
        rgba.write_to(&mut cursor, image::ImageFormat::Png)
            .expect("encode png");
        buffer
    }

    #[test]
    fn png_compression_reduces_size() {
        let original = sample_png();
        let compressed = compress_png(original.clone()).expect("compress png");
        assert!(compressed.len() < original.len());
        let reduction = 1.0 - (compressed.len() as f64 / original.len() as f64);
        assert!(reduction >= 0.30, "expected >= 30% reduction, got {reduction}");
    }
}
