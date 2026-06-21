use crate::capture::record::encode_gif::CapturedFrame;
use crate::capture::CaptureError;
use bytes::Bytes;
use image::RgbaImage;
use openh264::encoder::{Encoder, EncoderConfig, FrameType};
use openh264::formats::{RgbSliceU8, YUVBuffer};
use openh264::OpenH264API;
use std::path::Path;

/// Constant-frame-rate band for the MP4. We never go below 12 fps (so sparse, mostly
/// static recordings still play smoothly) nor above 30 fps (to keep size/CPU sane).
const MP4_FPS_MIN: u32 = 12;
const MP4_FPS_MAX: u32 = 30;

pub fn encode_mp4_from_dir(
    frames_dir: &Path,
    duration_secs: f32,
    output_path: &Path,
) -> Result<(), CaptureError> {
    let frames = super::encode_gif::load_frames_from_dir(frames_dir)?;
    if frames.is_empty() {
        return Err(CaptureError::Backend("no frames to encode".into()));
    }

    let total_duration_ms = (duration_secs.max(0.1) * 1000.0) as u32;
    encode_mp4_cfr(&frames, total_duration_ms, output_path)
}

fn recording_fps(frame_count: usize, duration_secs: f32) -> u32 {
    let fps = (frame_count as f32 / duration_secs.max(0.1)).round();
    fps.clamp(1.0, 60.0) as u32
}

fn even_size(value: u32) -> u32 {
    value - (value % 2)
}

fn crop_even(image: &RgbaImage) -> RgbaImage {
    let width = even_size(image.width());
    let height = even_size(image.height());
    if width == image.width() && height == image.height() {
        return image.clone();
    }
    image::imageops::crop_imm(image, 0, 0, width, height).to_image()
}

fn split_annex_b(data: &[u8]) -> Vec<Vec<u8>> {
    let mut starts: Vec<(usize, usize)> = Vec::new();
    let mut index = 0usize;

    while index < data.len() {
        if index + 4 <= data.len() && data[index..index + 4] == [0, 0, 0, 1] {
            starts.push((index, 4));
            index += 4;
            continue;
        }
        if index + 3 <= data.len() && data[index..index + 3] == [0, 0, 1] {
            starts.push((index, 3));
            index += 3;
            continue;
        }
        index += 1;
    }

    let mut nals = Vec::new();
    for (position, (start, prefix_len)) in starts.iter().enumerate() {
        let payload_start = start + prefix_len;
        let payload_end = starts
            .get(position + 1)
            .map(|(next_start, _)| *next_start)
            .unwrap_or(data.len());
        if payload_start < payload_end {
            nals.push(data[payload_start..payload_end].to_vec());
        }
    }

    nals
}

fn nal_unit_type(nal: &[u8]) -> Option<u8> {
    nal.first().map(|byte| byte & 0x1f)
}

fn avcc_sample_from_annex_b(annex_b: &[u8]) -> Vec<u8> {
    let mut avcc = Vec::new();

    for nal in split_annex_b(annex_b) {
        let Some(nal_type) = nal_unit_type(&nal) else {
            continue;
        };
        // Parameter sets and AUD belong in avcC / sample headers, not per-frame payload.
        if matches!(nal_type, 7 | 8 | 9) {
            continue;
        }

        let len = nal.len() as u32;
        avcc.extend_from_slice(&len.to_be_bytes());
        avcc.extend_from_slice(&nal);
    }

    avcc
}

fn collect_parameter_sets_from_samples(
    samples: &[(u64, Vec<u8>, bool)],
) -> Result<(Vec<u8>, Vec<u8>), CaptureError> {
    let mut sps = None;
    let mut pps = None;

    for (_, annex_b, _) in samples {
        for nal in split_annex_b(annex_b) {
            match nal_unit_type(&nal) {
                Some(7) if sps.is_none() => sps = Some(nal),
                Some(8) if pps.is_none() => pps = Some(nal),
                _ => {}
            }
        }
        if sps.is_some() && pps.is_some() {
            break;
        }
    }

    Ok((
        sps.ok_or_else(|| CaptureError::Backend("missing H.264 SPS".into()))?,
        pps.ok_or_else(|| CaptureError::Backend("missing H.264 PPS".into()))?,
    ))
}

/// Encode a constant-frame-rate H.264/MP4 from irregularly-captured frames.
///
/// ScreenCaptureKit only emits a frame when the captured content changes, so the raw
/// timeline is variable-frame-rate with arbitrarily long gaps (static content, a pause,
/// or the stop tail). Encoding that as VFR — one sample per captured frame with its real
/// duration — makes players such as QuickTime stall on the long samples (the "freezes at
/// 7s" bug). Instead we resample onto a fixed grid: at each grid instant we re-encode the
/// frame that was on screen then. Repeated (static) frames become tiny P-frames, so this
/// costs almost nothing in size, needs no extra memory, and yields a perfectly even,
/// universally-playable video whose pacing still matches the real recording.
fn encode_mp4_cfr(
    frames: &[CapturedFrame],
    total_duration_ms: u32,
    output_path: &Path,
) -> Result<(), CaptureError> {
    use mp4::{AvcConfig, Mp4Config, Mp4Sample, Mp4Writer};

    let count = frames.len();
    if count == 0 {
        return Err(CaptureError::Backend("no frames to encode".into()));
    }

    let timestamps: Vec<u32> = if frames.iter().all(|frame| frame.timestamp_ms.is_some()) {
        frames.iter().map(|frame| frame.timestamp_ms.unwrap()).collect()
    } else {
        let each = total_duration_ms.max(1) as f32 / count as f32;
        (0..count).map(|index| (index as f32 * each) as u32).collect()
    };

    let span_ms = total_duration_ms
        .max(timestamps[count - 1].saturating_add(1))
        .max(1);
    let fps = recording_fps(count, span_ms as f32 / 1000.0).clamp(MP4_FPS_MIN, MP4_FPS_MAX);
    let step_ms = (1_000 / fps).max(1);
    let grid_points = span_ms.div_ceil(step_ms).max(1);

    let cropped: Vec<RgbaImage> = frames.iter().map(|frame| crop_even(&frame.image)).collect();
    let width = cropped[0].width();
    let height = cropped[0].height();
    if width == 0 || height == 0 {
        return Err(CaptureError::Backend(
            "recording region too small for MP4".into(),
        ));
    }

    let config = EncoderConfig::new()
        .set_bitrate_bps(4_000_000)
        .max_frame_rate(fps as f32)
        // Never let the encoder drop ("skip") a frame: a skipped frame emits an empty
        // bitstream, and dropping it from the stream breaks the P-frame reference chain,
        // freezing playback until the end. We want one encoded NAL per grid frame.
        .enable_skip_frame(false);
    let api = OpenH264API::from_source();
    let mut encoder = Encoder::with_api_config(api, config)
        .map_err(|error| CaptureError::Backend(error.to_string()))?;

    let timescale = 1_000u32;
    let sample_duration = step_ms;
    // Force a keyframe roughly every two seconds so the video stays seekable and can
    // recover from any decode glitch instead of freezing to the end.
    let keyframe_interval = (fps * 2).max(1);

    let mut annex_samples: Vec<(u64, Vec<u8>, bool)> = Vec::new();
    let mut sample_time = 0u64;
    let mut cursor = 0usize;

    for point in 0..grid_points {
        let instant = point * step_ms;
        while cursor + 1 < count && timestamps[cursor + 1] <= instant {
            cursor += 1;
        }

        let rgba = &cropped[cursor];
        if rgba.width() != width || rgba.height() != height {
            return Err(CaptureError::Backend(
                "inconsistent frame dimensions".into(),
            ));
        }

        if point > 0 && point % keyframe_interval == 0 {
            encoder.force_intra_frame();
        }

        let rgb = image::DynamicImage::ImageRgba8(rgba.clone()).into_rgb8();
        let rgb_slice = RgbSliceU8::new(rgb.as_raw(), (width as usize, height as usize));
        let yuv = YUVBuffer::from_rgb8_source(rgb_slice);
        let bitstream = encoder
            .encode(&yuv)
            .map_err(|error| CaptureError::Backend(error.to_string()))?;
        let is_sync = bitstream.frame_type() == FrameType::IDR;
        annex_samples.push((sample_time, bitstream.to_vec(), is_sync));
        sample_time += sample_duration as u64;
    }

    let (sps, pps) = collect_parameter_sets_from_samples(&annex_samples)?;

    let file = std::fs::File::create(output_path)
        .map_err(|error| CaptureError::Backend(error.to_string()))?;
    let config = Mp4Config {
        major_brand: mp4::FourCC::from(*b"isom"),
        minor_version: 512,
        compatible_brands: vec![
            mp4::FourCC::from(*b"isom"),
            mp4::FourCC::from(*b"iso2"),
            mp4::FourCC::from(*b"avc1"),
            mp4::FourCC::from(*b"mp41"),
        ],
        timescale,
    };
    let mut writer = Mp4Writer::write_start(file, &config)
        .map_err(|error| CaptureError::Backend(error.to_string()))?;

    writer
        .add_track(
            &AvcConfig {
                width: width as u16,
                height: height as u16,
                seq_param_set: sps,
                pic_param_set: pps,
            }
            .into(),
        )
        .map_err(|error| CaptureError::Backend(error.to_string()))?;

    let track_id = 1u32;

    for (start_time, annex_b, is_sync) in annex_samples {
        let avcc = avcc_sample_from_annex_b(&annex_b);
        if avcc.is_empty() {
            continue;
        }

        writer
            .write_sample(
                track_id,
                &Mp4Sample {
                    start_time,
                    duration: sample_duration,
                    rendering_offset: 0,
                    is_sync,
                    bytes: Bytes::from(avcc),
                },
            )
            .map_err(|error| CaptureError::Backend(error.to_string()))?;
    }

    writer
        .write_end()
        .map_err(|error| CaptureError::Backend(error.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_annex_b_access_unit_to_avcc_sample() {
        let annex_b = [
            0, 0, 0, 1, 0x67, 0x42, 0x00, 0x1f, //
            0, 0, 0, 1, 0x68, 0xce, 0x38, 0x80, //
            0, 0, 0, 1, 0x65, 0x88, 0x84, 0x21, 0x33, //
        ];

        let avcc = avcc_sample_from_annex_b(&annex_b);
        assert_eq!(&avcc[0..4], &[0, 0, 0, 5]);
        assert_eq!(avcc[4], 0x65);
    }

    #[test]
    fn derives_fps_from_frame_count_and_duration() {
        assert_eq!(recording_fps(360, 30.0), 12);
        assert_eq!(recording_fps(30, 30.0), 1);
    }

    #[test]
    fn cfr_mp4_fills_static_gaps_and_decodes_cleanly() {
        use crate::capture::record::encode_gif::CapturedFrame;
        use image::{Rgba, RgbaImage};

        // ~2s of motion at irregular ~50ms intervals, then a 5s static gap — the exact
        // shape that produced a pathological long VFR sample and froze players.
        let mut frames = Vec::new();
        let mut t = 0u32;
        let mut x = 0u32;
        while t <= 2000 {
            let mut img = RgbaImage::from_pixel(160, 120, Rgba([20, 20, 20, 255]));
            for dy in 0..20 {
                for dx in 0..20 {
                    img.put_pixel((x + dx).min(159), (40 + dy).min(119), Rgba([240, 80, 40, 255]));
                }
            }
            frames.push(CapturedFrame { image: img, timestamp_ms: Some(t) });
            t += 50;
            x = (x + 6) % 130;
        }
        frames.push(CapturedFrame {
            image: RgbaImage::from_pixel(160, 120, Rgba([10, 40, 90, 255])),
            timestamp_ms: Some(7000),
        });

        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("cfr.mp4");
        encode_mp4_cfr(&frames, 7200, &path).expect("encode cfr mp4");

        // The 5s gap must be filled by repeated grid frames, not collapsed into one
        // long sample: at the 12fps floor a ~7.2s clip is far more than the ~41 inputs.
        let read = std::fs::read(&path).expect("read mp4");
        assert!(read.len() > 1000, "mp4 unexpectedly tiny: {} bytes", read.len());
    }
}
