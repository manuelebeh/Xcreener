use crate::capture::types::CaptureProgressPayload;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub static RECORDING_ACTIVE: AtomicBool = AtomicBool::new(false);
pub static RECORDING_PAUSED: AtomicBool = AtomicBool::new(false);
pub static RECORDING_STOP_REQUESTED: AtomicBool = AtomicBool::new(false);
pub static RECORDING_CANCELLED: AtomicBool = AtomicBool::new(false);
pub static RECORDING_FRAME_COUNT: AtomicU32 = AtomicU32::new(0);
static RECORDING_NEXT_FRAME_INDEX: AtomicU32 = AtomicU32::new(0);

/// Tracks how much of a recording was spent paused so that frame timestamps, the final
/// duration, the HUD timer and the 30s cap all reflect only active recording time.
struct PauseTracker {
    total_paused: Duration,
    paused_since: Option<Instant>,
}

static PAUSE_TRACKER: OnceLock<Mutex<PauseTracker>> = OnceLock::new();

fn pause_tracker() -> &'static Mutex<PauseTracker> {
    PAUSE_TRACKER.get_or_init(|| {
        Mutex::new(PauseTracker {
            total_paused: Duration::ZERO,
            paused_since: None,
        })
    })
}

pub fn mark_recording_paused() {
    if let Ok(mut tracker) = pause_tracker().lock() {
        if tracker.paused_since.is_none() {
            tracker.paused_since = Some(Instant::now());
        }
    }
}

pub fn mark_recording_resumed() {
    if let Ok(mut tracker) = pause_tracker().lock() {
        if let Some(since) = tracker.paused_since.take() {
            tracker.total_paused += since.elapsed();
        }
    }
}

/// Wall-clock time since `started_at` minus every paused interval, in milliseconds.
pub fn active_elapsed_ms(started_at: Instant) -> u32 {
    let mut paused = Duration::ZERO;
    if let Ok(tracker) = pause_tracker().lock() {
        paused = tracker.total_paused;
        if let Some(since) = tracker.paused_since {
            paused += since.elapsed();
        }
    }
    started_at
        .elapsed()
        .saturating_sub(paused)
        .as_millis()
        .min(u128::from(u32::MAX)) as u32
}

pub fn reset_recording_flags() {
    RECORDING_PAUSED.store(false, Ordering::SeqCst);
    RECORDING_STOP_REQUESTED.store(false, Ordering::SeqCst);
    RECORDING_CANCELLED.store(false, Ordering::SeqCst);
    RECORDING_FRAME_COUNT.store(0, Ordering::SeqCst);
    RECORDING_NEXT_FRAME_INDEX.store(0, Ordering::SeqCst);
    if let Ok(mut tracker) = pause_tracker().lock() {
        tracker.total_paused = Duration::ZERO;
        tracker.paused_since = None;
    }
}

pub fn recording_is_paused() -> bool {
    RECORDING_PAUSED.load(Ordering::SeqCst)
}

pub fn recording_is_cancelled() -> bool {
    RECORDING_CANCELLED.load(Ordering::SeqCst)
}

pub fn recording_stop_requested() -> bool {
    RECORDING_STOP_REQUESTED.load(Ordering::SeqCst)
}

pub fn request_recording_stop() {
    RECORDING_STOP_REQUESTED.store(true, Ordering::SeqCst);
}

pub fn allocate_frame_index() -> u32 {
    RECORDING_NEXT_FRAME_INDEX.fetch_add(1, Ordering::SeqCst)
}

pub fn record_frame_saved() {
    RECORDING_FRAME_COUNT.fetch_add(1, Ordering::SeqCst);
}

pub fn emit_recording_progress(app: &AppHandle, started_at: Instant, max_duration_secs: u32) {
    let elapsed = active_elapsed_ms(started_at) as f32 / 1000.0;
    let _ = app.emit(
        "capture-progress",
        CaptureProgressPayload {
            phase: "recording".into(),
            remaining_secs: None,
            current: None,
            total: None,
            elapsed_secs: Some(elapsed),
            paused: Some(recording_is_paused()),
            frame_count: Some(RECORDING_FRAME_COUNT.load(Ordering::SeqCst)),
            max_duration_secs: Some(max_duration_secs),
        },
    );
}
