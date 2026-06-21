//! macOS region recording via ScreenCaptureKit streaming (ADR-008).

use crate::capture::record::control::{
    active_elapsed_ms, allocate_frame_index, emit_recording_progress, record_frame_saved,
    recording_is_cancelled, recording_is_paused, recording_stop_requested, request_recording_stop,
    RECORDING_FRAME_COUNT,
};
use crate::capture::record::encode_gif::write_frame_rgba;
use crate::capture::types::Rect;
use crate::capture::{find_monitor_for_region, list_monitors, CaptureError, MonitorInfo};
use image::RgbaImage;
use screencapturekit::cm::CMSampleBufferExt;
use screencapturekit::cg::CGRect;
use screencapturekit::cm::CMTime;
use screencapturekit::cv::CVPixelBufferLockFlags;
use screencapturekit::prelude::*;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::AppHandle;

const TARGET_FPS: i32 = 30;

struct RegionFrameHandler {
    frames_dir: PathBuf,
    app: AppHandle,
    started_at: Instant,
    max_duration_secs: u32,
    progress_every: AtomicU32,
    writes_in_flight: Arc<AtomicU32>,
}

impl RegionFrameHandler {
    fn maybe_emit_progress(&self) {
        let frame = RECORDING_FRAME_COUNT.load(Ordering::SeqCst);
        let last = self.progress_every.load(Ordering::Relaxed);
        if frame == 0 || frame.saturating_sub(last) >= 3 {
            self.progress_every.store(frame, Ordering::Relaxed);
            emit_recording_progress(&self.app, self.started_at, self.max_duration_secs);
        }
    }

    fn write_frame(&self, rgba: &RgbaImage) {
        if recording_stop_requested() || recording_is_cancelled() {
            return;
        }

        self.writes_in_flight.fetch_add(1, Ordering::SeqCst);
        let frame_index = allocate_frame_index();
        // Stamp each frame with its active capture offset (ms since start, excluding any
        // paused time) so the encoder can rebuild real-time playback. ScreenCaptureKit
        // only emits a frame when content changes, so frames arrive at irregular
        // intervals, not a fixed cadence.
        let timestamp_ms = active_elapsed_ms(self.started_at);
        let frame_path = self
            .frames_dir
            .join(format!("frame_{frame_index:05}_{timestamp_ms:09}.rgba"));
        let wrote = write_frame_rgba(&frame_path, rgba).is_ok();
        self.writes_in_flight.fetch_sub(1, Ordering::SeqCst);

        if wrote {
            record_frame_saved();
            self.maybe_emit_progress();
        }
    }
}

impl SCStreamOutputTrait for RegionFrameHandler {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, output_type: SCStreamOutputType) {
        if !matches!(output_type, SCStreamOutputType::Screen) {
            return;
        }
        if recording_stop_requested()
            || recording_is_cancelled()
            || recording_is_paused()
        {
            return;
        }

        if active_elapsed_ms(self.started_at) >= self.max_duration_secs.saturating_mul(1000) {
            request_recording_stop();
            return;
        }

        let Some(pixel_buffer) = sample.image_buffer() else {
            return;
        };

        let Ok(guard) = pixel_buffer.lock(CVPixelBufferLockFlags::READ_ONLY) else {
            return;
        };

        let width = guard.width() as u32;
        let height = guard.height() as u32;
        if width == 0 || height == 0 {
            return;
        }

        if recording_stop_requested() || recording_is_cancelled() {
            return;
        }

        let rgba = bgra_buffer_to_rgba(guard.as_slice(), width, height, guard.bytes_per_row());
        self.write_frame(&rgba);
    }
}

fn bgra_buffer_to_rgba(
    buffer: &[u8],
    width: u32,
    height: u32,
    bytes_per_row: usize,
) -> RgbaImage {
    let mut rgba = RgbaImage::new(width, height);
    let row_bytes = width as usize * 4;

    for y in 0..height as usize {
        let src_row = y * bytes_per_row;
        let dst_row = y * row_bytes;
        for x in 0..width as usize {
            let src = src_row + x * 4;
            let dst = dst_row + x * 4;
            rgba.as_mut()[dst] = buffer[src + 2];
            rgba.as_mut()[dst + 1] = buffer[src + 1];
            rgba.as_mut()[dst + 2] = buffer[src];
            rgba.as_mut()[dst + 3] = buffer[src + 3];
        }
    }

    rgba
}

fn find_sck_display(
    content: &SCShareableContent,
    monitor: &MonitorInfo,
) -> Result<screencapturekit::shareable_content::SCDisplay, CaptureError> {
    let displays = content.displays();
    displays
        .get(monitor.id as usize)
        .cloned()
        .or_else(|| displays.first().cloned())
        .ok_or(CaptureError::DisplayNotFound(monitor.id))
}

fn source_rect_for_region(region: &Rect, monitor: &MonitorInfo) -> CGRect {
    let rel_x = (region.x - monitor.x).max(0) as f64;
    let rel_y_top = (region.y - monitor.y).max(0) as f64;
    let width = region.width as f64;
    let height = region.height as f64;
    let rel_y = monitor.height as f64 - rel_y_top - height;
    CGRect::new(rel_x, rel_y, width, height)
}

fn wait_for_pending_writes(writes_in_flight: &Arc<AtomicU32>) {
    for _ in 0..500 {
        if writes_in_flight.load(Ordering::SeqCst) == 0 {
            return;
        }
        std::thread::sleep(Duration::from_millis(2));
    }
}

pub fn run_region_recording(
    app: AppHandle,
    frames_dir: PathBuf,
    region: Rect,
    max_duration_secs: u32,
    started_at: Instant,
) -> Result<(), CaptureError> {
    let monitors = list_monitors()?;
    let monitor = find_monitor_for_region(&monitors, &region)
        .or(monitors.first())
        .ok_or(CaptureError::NoDisplays)?;

    let content = SCShareableContent::get().map_err(map_sck_error)?;
    let display = find_sck_display(&content, monitor)?;

    let filter = SCContentFilter::create()
        .with_display(&display)
        .with_excluding_windows(&[])
        .build();

    let scale = monitor.scale_factor.max(1.0);
    let output_width = (region.width as f64 * scale).round().max(1.0) as u32;
    let output_height = (region.height as f64 * scale).round().max(1.0) as u32;
    let source_rect = source_rect_for_region(&region, monitor);
    let frame_interval = CMTime::new(1, TARGET_FPS);
    let writes_in_flight = Arc::new(AtomicU32::new(0));

    let config = SCStreamConfiguration::new()
        .with_width(output_width)
        .with_height(output_height)
        .with_pixel_format(PixelFormat::BGRA)
        .with_shows_cursor(true)
        .with_minimum_frame_interval(&frame_interval)
        .with_queue_depth(5)
        .with_source_rect(source_rect);

    let handler = RegionFrameHandler {
        frames_dir,
        app: app.clone(),
        started_at,
        max_duration_secs,
        progress_every: AtomicU32::new(0),
        writes_in_flight: Arc::clone(&writes_in_flight),
    };

    let mut stream = SCStream::new(&filter, &config);
    stream.add_output_handler(handler, SCStreamOutputType::Screen);
    stream
        .start_capture()
        .map_err(map_sck_error)?;

    emit_recording_progress(&app, started_at, max_duration_secs);

    while !recording_stop_requested() && !recording_is_cancelled() {
        if active_elapsed_ms(started_at) >= max_duration_secs.saturating_mul(1000) {
            request_recording_stop();
            break;
        }

        if recording_is_paused() {
            emit_recording_progress(&app, started_at, max_duration_secs);
            std::thread::sleep(Duration::from_millis(50));
            continue;
        }

        std::thread::sleep(Duration::from_millis(16));
    }

    let _ = stream.stop_capture();
    wait_for_pending_writes(&writes_in_flight);
    emit_recording_progress(&app, started_at, max_duration_secs);

    if RECORDING_FRAME_COUNT.load(Ordering::SeqCst) == 0 {
        return Err(CaptureError::Backend(
            "ScreenCaptureKit produced no frames".into(),
        ));
    }

    Ok(())
}

fn map_sck_error(error: SCError) -> CaptureError {
    let message = error.to_string();
    if message.to_ascii_lowercase().contains("permission")
        || message.to_ascii_lowercase().contains("not authorized")
        || message.to_ascii_lowercase().contains("denied")
    {
        CaptureError::PermissionDenied
    } else {
        CaptureError::Backend(message)
    }
}
