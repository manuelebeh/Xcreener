use crate::capture::CaptureError;
use image::RgbaImage;
use imagequant::{Attributes, Histogram, QuantizationResult, RGBA};
use std::path::{Path, PathBuf};

pub const DEFAULT_FRAME_DELAY_CS: u16 = 8;
pub const GIF_BUDGET_BYTES_PER_10_SECS: u64 = 10_000_000;

/// User-selectable quality for GIF recordings. Each level trades file size (and a little
/// encode time) for resolution and palette accuracy. macOS ScreenCaptureKit captures at
/// retina scale (often 2x the region); we cap the width up front so the budget loop
/// starts from a sane size instead of re-encoding every frame many times down from
/// retina width (seconds per pass, minutes total).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum GifQuality {
    Low,
    #[default]
    Medium,
    High,
}

impl GifQuality {
    /// Parse the camelCase string sent from the UI; unknown values fall back to Medium.
    pub fn from_label(label: &str) -> Self {
        match label {
            "low" => Self::Low,
            "high" => Self::High,
            _ => Self::Medium,
        }
    }

    /// Maximum GIF width in pixels. Frames wider than this are downscaled before encoding.
    fn max_width(self) -> u32 {
        match self {
            Self::Low => 720,
            Self::Medium => 900,
            Self::High => 1080,
        }
    }

    /// Size budget per 10 seconds of recording. A looser budget keeps more colors and
    /// resolution (fewer degrading passes), at the cost of a larger file.
    fn budget_bytes_per_10_secs(self) -> u64 {
        match self {
            Self::Low => GIF_BUDGET_BYTES_PER_10_SECS,
            Self::Medium => 14_000_000,
            Self::High => 20_000_000,
        }
    }

    /// libimagequant speed (1 = best/slowest, 10 = fastest). We have encode headroom
    /// after the width cap, so higher quality levels spend it on a better palette.
    fn quantize_speed(self) -> i32 {
        match self {
            Self::Low => 5,
            Self::Medium => 3,
            Self::High => 1,
        }
    }
}

/// A single captured frame together with the wall-clock offset (ms since recording
/// start) at which it was produced. The timestamp is what lets us rebuild real-time
/// playback instead of assuming a uniform frame rate — critical on macOS where
/// ScreenCaptureKit only delivers a frame when the captured content actually changes.
pub struct CapturedFrame {
    pub image: RgbaImage,
    pub timestamp_ms: Option<u32>,
}

/// Centiseconds per GIF frame so total playback matches wall-clock recording duration.
#[cfg(test)]
pub fn gif_frame_delay_cs(frame_count: usize, duration_secs: f32) -> u16 {
    if frame_count == 0 {
        return DEFAULT_FRAME_DELAY_CS;
    }

    let delay = ((duration_secs.max(0.1) * 100.0) / frame_count as f32).round();
    delay.clamp(2.0, 300.0) as u16
}

/// GIF grid frame rate. 20 fps maps to an exact 5-centisecond delay, which GIF's
/// 10ms-resolution timing can represent evenly — unlike 30 fps (~3.3cs), which would
/// wobble between 3cs and 4cs and look alternately slow and fast.
const GIF_GRID_FPS: u32 = 20;
const GIF_GRID_STEP_MS: u32 = 1000 / GIF_GRID_FPS;
const GIF_GRID_STEP_CS: u16 = (100 / GIF_GRID_FPS) as u16;

/// Build an evenly-paced GIF timeline from irregularly-captured frames.
///
/// We walk a uniform time grid (20 fps). At each grid instant we take the frame that
/// was on screen then (most recent capture at or before it). Consecutive grid points
/// that resolve to the same source frame are collapsed into a single GIF frame whose
/// delay is a multiple of the base step — so a static stretch becomes one frame held
/// for the right duration rather than many duplicates. The result plays at a steady
/// cadence, matches real time, and keeps the frame count (and memory) bounded by the
/// number of distinct captured frames.
pub fn build_gif_timeline(
    frames: &[CapturedFrame],
    total_duration_ms: u32,
) -> (Vec<RgbaImage>, Vec<u16>) {
    let count = frames.len();
    if count == 0 {
        return (Vec::new(), Vec::new());
    }

    let timestamps: Vec<u32> = if frames.iter().all(|frame| frame.timestamp_ms.is_some()) {
        frames.iter().map(|frame| frame.timestamp_ms.unwrap()).collect()
    } else {
        let each = total_duration_ms.max(1) as f32 / count as f32;
        (0..count).map(|index| (index as f32 * each) as u32).collect()
    };

    let span_ms = total_duration_ms
        .max(timestamps[count - 1].saturating_add(GIF_GRID_STEP_MS))
        .max(GIF_GRID_STEP_MS);
    let grid_points = span_ms.div_ceil(GIF_GRID_STEP_MS).max(1);

    let mut images: Vec<RgbaImage> = Vec::new();
    let mut delays: Vec<u16> = Vec::new();
    let mut cursor = 0usize;
    let mut last_pushed: Option<usize> = None;

    for point in 0..grid_points {
        let instant = point * GIF_GRID_STEP_MS;
        while cursor + 1 < count && timestamps[cursor + 1] <= instant {
            cursor += 1;
        }

        if last_pushed == Some(cursor) {
            if let Some(delay) = delays.last_mut() {
                *delay = delay.saturating_add(GIF_GRID_STEP_CS);
            }
        } else {
            images.push(frames[cursor].image.clone());
            delays.push(GIF_GRID_STEP_CS);
            last_pushed = Some(cursor);
        }
    }

    (images, delays)
}

pub fn gif_budget_for_duration(duration_secs: f32, quality: GifQuality) -> u64 {
    let ratio = (duration_secs / 10.0).max(0.1);
    (quality.budget_bytes_per_10_secs() as f64 * ratio as f64) as u64
}

fn rgba_pixels(frame: &RgbaImage) -> Vec<RGBA> {
    frame
        .pixels()
        .map(|pixel| RGBA {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3],
        })
        .collect()
}

/// Parse the capture timestamp encoded in a frame filename of the form
/// `frame_{index:05}_{timestamp_ms:09}.rgba`. Returns `None` for the legacy
/// `frame_{index:05}.rgba` layout so callers can fall back to uniform timing.
fn parse_frame_timestamp_ms(path: &Path) -> Option<u32> {
    let stem = path.file_stem()?.to_str()?;
    let parts: Vec<&str> = stem.split('_').collect();
    if parts.len() < 3 {
        return None;
    }
    parts.last()?.parse::<u32>().ok()
}

pub fn load_frames_from_dir(frames_dir: &Path) -> Result<Vec<CapturedFrame>, CaptureError> {
    let mut paths: Vec<PathBuf> = std::fs::read_dir(frames_dir)
        .map_err(|error| CaptureError::Backend(error.to_string()))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| ext == "rgba")
        })
        .collect();

    paths.sort();

    paths
        .into_iter()
        .map(|path| {
            let timestamp_ms = parse_frame_timestamp_ms(&path);
            let bytes = std::fs::read(&path).map_err(|error| CaptureError::Backend(error.to_string()))?;
            if bytes.len() < 8 {
                return Err(CaptureError::Backend("invalid frame file".into()));
            }
            let width = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
            let height = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
            let expected = 8 + (width as usize * height as usize * 4);
            if bytes.len() != expected {
                return Err(CaptureError::Backend(format!(
                    "frame size mismatch for {}",
                    path.display()
                )));
            }
            let image = RgbaImage::from_raw(width, height, bytes[8..].to_vec())
                .ok_or_else(|| CaptureError::Backend("invalid frame dimensions".into()))?;
            Ok(CapturedFrame { image, timestamp_ms })
        })
        .collect()
}

fn quantize_frames(
    frames: &[RgbaImage],
    max_colors: u32,
    speed: i32,
) -> Result<QuantizationResult, CaptureError> {
    let mut attributes = Attributes::new();
    let _ = attributes.set_max_colors(max_colors);
    let _ = attributes.set_speed(speed);
    let mut histogram = Histogram::new(&attributes);

    for frame in frames {
        let width = frame.width() as usize;
        let height = frame.height() as usize;
        let mut image = attributes
            .new_image(rgba_pixels(frame), width, height, 0.0)
            .map_err(|error| CaptureError::Backend(error.to_string()))?;
        histogram
            .add_image(&attributes, &mut image)
            .map_err(|error| CaptureError::Backend(error.to_string()))?;
    }

    histogram
        .quantize(&attributes)
        .map_err(|error| CaptureError::Backend(error.to_string()))
}

fn write_gif_bytes(
    frames: &[RgbaImage],
    palette_result: &mut QuantizationResult,
    attributes: &Attributes,
    delays_cs: &[u16],
) -> Result<Vec<u8>, CaptureError> {
    if frames.is_empty() {
        return Err(CaptureError::Backend("no frames to encode".into()));
    }

    let width = frames[0].width() as u16;
    let height = frames[0].height() as u16;
    let palette: Vec<u8> = palette_result
        .palette()
        .iter()
        .flat_map(|color| [color.r, color.g, color.b])
        .collect();

    let mut buffer = Vec::new();
    {
        let mut encoder = gif::Encoder::new(&mut buffer, width, height, &palette)
            .map_err(|error| CaptureError::Backend(error.to_string()))?;
        // Repeat::Finite(0) loops zero extra times; for a looping recording we want the
        // animation to repeat indefinitely.
        encoder
            .set_repeat(gif::Repeat::Infinite)
            .map_err(|error| CaptureError::Backend(error.to_string()))?;

        for (index, frame) in frames.iter().enumerate() {
            let width_usize = frame.width() as usize;
            let height_usize = frame.height() as usize;
            let mut image = attributes
                .new_image(rgba_pixels(frame), width_usize, height_usize, 0.0)
                .map_err(|error| CaptureError::Backend(error.to_string()))?;
            let (_, indexed) = palette_result
                .remapped(&mut image)
                .map_err(|error| CaptureError::Backend(error.to_string()))?;
            let mut gif_frame =
                gif::Frame::from_indexed_pixels(width, height, indexed.clone(), None);
            gif_frame.delay = delays_cs.get(index).copied().unwrap_or(DEFAULT_FRAME_DELAY_CS);
            encoder
                .write_frame(&gif_frame)
                .map_err(|error| CaptureError::Backend(error.to_string()))?;
        }
    }

    Ok(buffer)
}

fn resize_frames(frames: &[RgbaImage], scale: f32) -> Vec<RgbaImage> {
    frames
        .iter()
        .map(|frame| {
            let width = ((frame.width() as f32) * scale).round().max(1.0) as u32;
            let height = ((frame.height() as f32) * scale).round().max(1.0) as u32;
            image::imageops::resize(frame, width, height, image::imageops::FilterType::Triangle)
        })
        .collect()
}

/// Downscale frames so their width does not exceed `GIF_MAX_WIDTH`, preserving aspect
/// ratio. No-op when the frames are already within budget width.
fn clamp_frames_width(frames: Vec<RgbaImage>, max_width: u32) -> Vec<RgbaImage> {
    let width = frames.first().map(RgbaImage::width).unwrap_or(0);
    if width <= max_width {
        return frames;
    }
    let scale = max_width as f32 / width as f32;
    resize_frames(&frames, scale)
}

/// Encode a GIF with one delay per frame so playback timing matches when each frame
/// was actually captured.
pub fn encode_gif_from_frames_with_delays(
    frames: &[RgbaImage],
    duration_secs: f32,
    delays_cs: &[u16],
    quality: GifQuality,
) -> Result<Vec<u8>, CaptureError> {
    if frames.is_empty() {
        return Err(CaptureError::Backend("no frames to encode".into()));
    }

    let budget = gif_budget_for_duration(duration_secs, quality);
    let speed = quality.quantize_speed();
    // Cap resolution up front so the budget loop below starts from a sane size instead
    // of grinding many full-resolution re-encodes down from retina width.
    let mut working: Vec<RgbaImage> = clamp_frames_width(frames.to_vec(), quality.max_width());
    let mut colors: u32 = 256;
    let attributes = Attributes::new();

    loop {
        let mut quantized = quantize_frames(&working, colors, speed)?;
        let bytes = write_gif_bytes(&working, &mut quantized, &attributes, delays_cs)?;

        if bytes.len() as u64 <= budget || (working[0].width() <= 160 && colors <= 64) {
            return Ok(bytes);
        }

        if colors > 64 {
            colors = colors.saturating_sub(64).max(64);
            continue;
        }

        working = resize_frames(&working, 0.85);
        colors = 256;
    }
}

/// Uniform-delay convenience wrapper used by tests.
#[cfg(test)]
pub fn encode_gif_from_frames(
    frames: &[RgbaImage],
    duration_secs: f32,
    delay_cs: u16,
    quality: GifQuality,
) -> Result<Vec<u8>, CaptureError> {
    let delays = vec![delay_cs; frames.len()];
    encode_gif_from_frames_with_delays(frames, duration_secs, &delays, quality)
}

pub fn encode_gif_from_dir(
    frames_dir: &Path,
    duration_secs: f32,
    quality: GifQuality,
) -> Result<Vec<u8>, CaptureError> {
    let frames = load_frames_from_dir(frames_dir)?;
    let total_duration_ms = (duration_secs.max(0.1) * 1000.0) as u32;
    let (images, delays) = build_gif_timeline(&frames, total_duration_ms);
    encode_gif_from_frames_with_delays(&images, duration_secs, &delays, quality)
}

pub fn write_frame_rgba(path: &Path, image: &RgbaImage) -> Result<(), CaptureError> {
    let mut bytes = Vec::with_capacity(8 + image.as_raw().len());
    bytes.extend_from_slice(&image.width().to_le_bytes());
    bytes.extend_from_slice(&image.height().to_le_bytes());
    bytes.extend_from_slice(image.as_raw());

    let tmp_path = path.with_extension("rgba.part");
    std::fs::write(&tmp_path, bytes).map_err(|error| CaptureError::Backend(error.to_string()))?;
    std::fs::rename(&tmp_path, path).map_err(|error| CaptureError::Backend(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    fn synthetic_frame(width: u32, height: u32, hue: u8) -> RgbaImage {
        RgbaImage::from_fn(width, height, |x, y| {
            Rgba([
                hue.wrapping_add((x % 256) as u8),
                hue.wrapping_add((y % 256) as u8),
                128,
                255,
            ])
        })
    }

    #[test]
    fn encodes_ten_second_gif_under_budget() {
        let frames: Vec<_> = (0..120)
            .map(|index| synthetic_frame(640, 360, (index * 2) as u8))
            .collect();

        let delay = gif_frame_delay_cs(frames.len(), 10.0);
        assert_eq!(delay, 8);

        let bytes = encode_gif_from_frames(&frames, 10.0, delay, GifQuality::Low).expect("encode");
        assert!(
            bytes.len() < GIF_BUDGET_BYTES_PER_10_SECS as usize,
            "gif size {} exceeds budget",
            bytes.len()
        );
    }

    #[test]
    fn clamps_frame_width_to_gif_max() {
        let frames = vec![synthetic_frame(1920, 1080, 0)];
        let clamped = clamp_frames_width(frames, 720);
        assert_eq!(clamped[0].width(), 720);
        // Aspect ratio preserved (1920x1080 -> 720x405).
        assert_eq!(clamped[0].height(), 405);
    }

    #[test]
    fn keeps_small_frames_untouched() {
        let frames = vec![synthetic_frame(320, 240, 0)];
        let clamped = clamp_frames_width(frames, 720);
        assert_eq!(clamped[0].width(), 320);
        assert_eq!(clamped[0].height(), 240);
    }

    #[test]
    fn higher_quality_allows_wider_gif_and_larger_budget() {
        assert!(GifQuality::High.max_width() > GifQuality::Low.max_width());
        assert!(
            GifQuality::High.budget_bytes_per_10_secs()
                > GifQuality::Low.budget_bytes_per_10_secs()
        );
        assert_eq!(GifQuality::from_label("high"), GifQuality::High);
        assert_eq!(GifQuality::from_label("unknown"), GifQuality::Medium);
    }

    #[test]
    fn scales_gif_frame_delay_to_match_duration() {
        assert_eq!(gif_frame_delay_cs(30, 30.0), 100);
        assert_eq!(gif_frame_delay_cs(360, 30.0), 8);
    }

    fn frame_with_ts(ts: Option<u32>) -> CapturedFrame {
        CapturedFrame {
            image: synthetic_frame(2, 2, 0),
            timestamp_ms: ts,
        }
    }

    #[test]
    fn gif_timeline_uses_even_grid_and_collapses_static_runs() {
        // Two distinct frames: the first stays on screen ~1s, the second briefly.
        let frames = vec![
            frame_with_ts(Some(0)),
            frame_with_ts(Some(1000)),
        ];
        let (images, delays) = build_gif_timeline(&frames, 1100);

        // One GIF frame per distinct source frame, no duplication blow-up.
        assert_eq!(images.len(), 2);
        // Every delay is a multiple of the 5cs grid step -> perfectly even cadence.
        assert!(delays.iter().all(|delay| delay % GIF_GRID_STEP_CS == 0));
        // First frame held ~1s (20 grid steps of 5cs), so it gets the long delay.
        assert_eq!(delays[0], 100);
    }

    #[test]
    fn gif_timeline_falls_back_to_uniform_without_timestamps() {
        let frames = vec![frame_with_ts(None), frame_with_ts(None), frame_with_ts(None)];
        let (images, delays) = build_gif_timeline(&frames, 600);
        assert_eq!(images.len(), delays.len());
        assert!(!images.is_empty());
        assert!(delays.iter().all(|delay| delay % GIF_GRID_STEP_CS == 0));
    }
}
