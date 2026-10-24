use super::control::{
    active_elapsed_ms, emit_recording_progress, mark_recording_paused, mark_recording_resumed,
    request_recording_stop, reset_recording_flags, RECORDING_ACTIVE, RECORDING_CANCELLED,
    RECORDING_FRAME_COUNT, RECORDING_PAUSED,
};
#[cfg(not(target_os = "macos"))]
use super::control::{
    allocate_frame_index, record_frame_saved, recording_is_cancelled, recording_stop_requested,
};
use super::encode_gif::{encode_gif_from_dir, GifQuality};
#[cfg(not(target_os = "macos"))]
use super::encode_gif::write_frame_rgba;
use super::encode_mp4::encode_mp4_from_dir;
use crate::capture::native::{cancel_live_capture, reset_live_capture_cancelled};
use crate::capture::types::{
    CaptureRecordStartRequest, CaptureRecordingCompletePayload, Rect,
};
use crate::capture::{capture_region, list_monitors, validate_region, CaptureError};
use crate::overlay;
#[cfg(not(target_os = "macos"))]
use image::RgbaImage;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(not(target_os = "macos"))]
const CAPTURE_INTERVAL_MS: u64 = 50;

/// GIF recordings auto-stop at this many seconds (short shareable loops).
const GIF_MAX_DURATION_SECS: u32 = 8;

static RECORDING_STATE: OnceLock<Mutex<Option<RecordingSessionState>>> = OnceLock::new();

struct RecordingSessionState {
    frames_dir: PathBuf,
    region: Rect,
    output_format: String,
    gif_quality: GifQuality,
    width: u32,
    height: u32,
    started_at: Instant,
    join_handle: Option<std::thread::JoinHandle<Result<(), CaptureError>>>,
}

fn recording_state() -> &'static Mutex<Option<RecordingSessionState>> {
    RECORDING_STATE.get_or_init(|| Mutex::new(None))
}

#[cfg(not(target_os = "macos"))]
fn decode_png_to_rgba(png_bytes: &[u8]) -> Result<RgbaImage, CaptureError> {
    image::load_from_memory(png_bytes)
        .map_err(|error| CaptureError::Backend(error.to_string()))
        .map(|image| image.to_rgba8())
}

#[cfg(not(target_os = "macos"))]
fn capture_loop(
    app: AppHandle,
    frames_dir: PathBuf,
    region: Rect,
    max_duration_secs: u32,
    started_at: Instant,
) -> Result<(), CaptureError> {
    use std::sync::atomic::Ordering;

    while !recording_stop_requested() && !recording_is_cancelled() {
        if active_elapsed_ms(started_at) >= max_duration_secs.saturating_mul(1000) {
            request_recording_stop();
            break;
        }

        if RECORDING_PAUSED.load(Ordering::SeqCst) {
            emit_recording_progress(&app, started_at, max_duration_secs);
            std::thread::sleep(Duration::from_millis(50));
            continue;
        }

        let png = capture_region(region.x, region.y, region.width, region.height)?;
        let rgba = decode_png_to_rgba(&png)?;
        // Stamp the frame with its active capture offset (ms, excluding paused time) so
        // encoders reproduce real-time playback rather than assuming a fixed frame rate.
        let timestamp_ms = active_elapsed_ms(started_at);
        let frame_index = allocate_frame_index();
        let frame_path =
            frames_dir.join(format!("frame_{frame_index:05}_{timestamp_ms:09}.rgba"));
        write_frame_rgba(&frame_path, &rgba)?;
        record_frame_saved();
        emit_recording_progress(&app, started_at, max_duration_secs);

        let step = Duration::from_millis(CAPTURE_INTERVAL_MS);
        let step_start = Instant::now();
        while step_start.elapsed() < step {
            if recording_stop_requested() || recording_is_cancelled() {
                break;
            }
            if RECORDING_PAUSED.load(Ordering::SeqCst) {
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn capture_loop(
    app: AppHandle,
    frames_dir: PathBuf,
    region: Rect,
    max_duration_secs: u32,
    started_at: Instant,
) -> Result<(), CaptureError> {
    crate::capture::platform::run_macos_region_recording(
        app,
        frames_dir,
        region,
        max_duration_secs,
        started_at,
    )
}

fn cleanup_frames_dir(path: &Path) {
    let _ = std::fs::remove_dir_all(path);
}

fn recording_staging_path(app: &AppHandle, format: &str) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let staging = base.join("recording-staging");
    std::fs::create_dir_all(&staging).map_err(|error| error.to_string())?;

    let ext = if format == "mp4" { "mp4" } else { "gif" };
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    Ok(staging.join(format!("snapglow-recording-{stamp}.{ext}")))
}

fn finalize_region_recording(
    app: &AppHandle,
    mut state: RecordingSessionState,
) -> Result<CaptureRecordingCompletePayload, String> {
    use std::sync::atomic::Ordering;

    if RECORDING_ACTIVE
        .compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("recording already finalized".into());
    }

    if let Some(handle) = state.join_handle.take() {
        handle
            .join()
            .map_err(|_| "recording thread panicked".to_string())?
            .map_err(|error| error.into_message())?;
    }

    let frame_count = RECORDING_FRAME_COUNT.load(Ordering::SeqCst);
    if frame_count == 0 {
        cleanup_frames_dir(&state.frames_dir);
        return Err("recording produced no frames".into());
    }

    let duration_ms = active_elapsed_ms(state.started_at);
    let duration_secs = (duration_ms as f32 / 1000.0).max(0.1);

    let output_dir = tempfile::tempdir().map_err(|error| error.to_string())?;
    let output_path = if state.output_format == "mp4" {
        let path = output_dir.path().join("recording.mp4");
        encode_mp4_from_dir(&state.frames_dir, duration_secs, &path)
            .map_err(|error| error.into_message())?;
        path
    } else {
        let bytes = encode_gif_from_dir(&state.frames_dir, duration_secs, state.gif_quality)
            .map_err(|error| error.into_message())?;
        let path = output_dir.path().join("recording.gif");
        std::fs::write(&path, bytes).map_err(|error| error.to_string())?;
        path
    };

    cleanup_frames_dir(&state.frames_dir);

    let file_size = std::fs::metadata(&output_path)
        .map_err(|error| error.to_string())?
        .len();

    let stable_path = recording_staging_path(app, &state.output_format)?;
    std::fs::copy(&output_path, &stable_path).map_err(|error| error.to_string())?;

    let thumbnail_png = capture_region(
        state.region.x,
        state.region.y,
        state.region.width,
        state.region.height,
    )
    .ok();
    let has_thumbnail = thumbnail_png.is_some();
    if let Some(png) = thumbnail_png {
        crate::commands::raw_ipc::RECORDING_THUMBNAIL.set(png);
    }

    let payload = CaptureRecordingCompletePayload {
        file_path: stable_path.to_string_lossy().into_owned(),
        format: state.output_format,
        width: state.width,
        height: state.height,
        duration_ms,
        file_size,
        has_thumbnail,
    };

    let _ = app.emit("capture-recording-complete", payload.clone());
    let _ = overlay::hide_capture_overlay_only(app);
    Ok(payload)
}

pub fn start_region_recording(
    app: &AppHandle,
    request: CaptureRecordStartRequest,
) -> Result<(), String> {
    use std::sync::atomic::Ordering;

    if RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err("recording already in progress".into());
    }

    let output_format = if request.output_format == "mp4" {
        "mp4".to_string()
    } else {
        "gif".to_string()
    };
    // GIFs are meant to be short shareable loops: cap them at 8s (recording auto-stops
    // at the limit). MP4 keeps the full 30s ceiling.
    let format_cap_secs = if output_format == "gif" { GIF_MAX_DURATION_SECS } else { 30 };
    let max_duration_secs = request.max_duration_secs.min(format_cap_secs).max(1);
    let gif_quality = GifQuality::from_label(&request.gif_quality);

    let monitors = list_monitors().map_err(|error| error.into_message())?;
    validate_region(&request.rect, &monitors).map_err(|error| error.into_message())?;

    reset_live_capture_cancelled();
    reset_recording_flags();
    RECORDING_ACTIVE.store(true, Ordering::SeqCst);

    #[cfg(target_os = "macos")]
    crate::capture::platform::ensure_screen_capture_permission()
        .map_err(|error| error.into_message())?;

    overlay::show_capture_progress_hud(app)?;
    std::thread::sleep(Duration::from_millis(200));

    let frames_dir = tempfile::tempdir()
        .map_err(|error| error.to_string())?
        .keep();

    let started_at = Instant::now();
    let region = request.rect.clone();
    let app_handle = app.clone();
    let capture_frames_dir = frames_dir.clone();

    let join_handle = std::thread::spawn(move || {
        capture_loop(
            app_handle,
            capture_frames_dir,
            region,
            max_duration_secs,
            started_at,
        )
    });

    let mut guard = recording_state()
        .lock()
        .map_err(|_| "recording state poisoned".to_string())?;
    *guard = Some(RecordingSessionState {
        frames_dir,
        region: request.rect.clone(),
        output_format,
        gif_quality,
        width: request.rect.width,
        height: request.rect.height,
        started_at,
        join_handle: Some(join_handle),
    });

    emit_recording_progress(app, started_at, max_duration_secs);
    Ok(())
}

pub fn pause_region_recording() -> Result<(), String> {
    use std::sync::atomic::Ordering;

    if !RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err("no recording in progress".into());
    }
    mark_recording_paused();
    RECORDING_PAUSED.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn resume_region_recording() -> Result<(), String> {
    use std::sync::atomic::Ordering;

    if !RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err("no recording in progress".into());
    }
    RECORDING_PAUSED.store(false, Ordering::SeqCst);
    mark_recording_resumed();
    Ok(())
}

pub fn cancel_region_recording() -> Result<(), String> {
    use std::sync::atomic::Ordering;

    RECORDING_CANCELLED.store(true, Ordering::SeqCst);
    cancel_live_capture();

    let mut guard = recording_state()
        .lock()
        .map_err(|_| "recording state poisoned".to_string())?;
    let Some(mut state) = guard.take() else {
        RECORDING_ACTIVE.store(false, Ordering::SeqCst);
        return Ok(());
    };

    if let Some(handle) = state.join_handle.take() {
        let _ = handle.join();
    }

    cleanup_frames_dir(&state.frames_dir);
    RECORDING_ACTIVE.store(false, Ordering::SeqCst);
    Ok(())
}

pub fn stop_region_recording(app: &AppHandle) -> Result<CaptureRecordingCompletePayload, String> {
    use std::sync::atomic::Ordering;

    if !RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err("no recording in progress".into());
    }

    request_recording_stop();

    let mut guard = recording_state()
        .lock()
        .map_err(|_| "recording state poisoned".to_string())?;
    let Some(state) = guard.take() else {
        if !RECORDING_ACTIVE.load(Ordering::SeqCst) {
            return Err("recording already finalized".into());
        }
        return Err("recording session not found".into());
    };

    finalize_region_recording(app, state)
}
