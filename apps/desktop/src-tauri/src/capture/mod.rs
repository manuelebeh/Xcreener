mod types;
mod validate;

pub mod platform;

pub mod native;
pub mod record;
pub mod scroll;
pub mod stitch;

pub use native::{cancel_live_capture, capture_native};
pub use record::{
    cancel_region_recording, pause_region_recording, resume_region_recording,
    start_region_recording, stop_region_recording,
};
pub use scroll::{capture_scrolling_window, request_scroll_capture_stop};
pub use types::{
    CaptureErrorPayload, CaptureNativeRequest, CaptureOverlayBounds, CaptureOverlayInitPayload,
    CaptureProgressPayload, CaptureRecordStartRequest, CaptureRecordingCompletePayload,
    MonitorInfo, OverlayWebviewLayout, Rect, WindowInfo,
};
pub use validate::{validate_monitor_id, validate_region, validate_window_id};

use image::codecs::png::PngEncoder;
use image::imageops;
use image::ExtendedColorType;
use image::ImageEncoder;
use image::RgbaImage;
use thiserror::Error;
use xcap::{Monitor, Window};

#[derive(Debug, Error)]
pub enum CaptureError {
    #[error("capture dimensions must be greater than zero")]
    InvalidDimensions,
    #[error("no displays available for capture")]
    NoDisplays,
    #[error("capture region is outside available displays")]
    RegionOutOfBounds,
    #[error("display {0} not found")]
    DisplayNotFound(u32),
    #[error("window {0} not found")]
    WindowNotFound(u64),
    #[error("screen recording permission denied - enable Screen Recording for Xcreener in System Settings")]
    PermissionDenied,
    #[error("capture failed: {0}")]
    Backend(String),
}

impl CaptureError {
    pub fn into_message(self) -> String {
        self.to_string()
    }
}

pub fn encode_png(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, CaptureError> {
    let mut png_bytes = Vec::new();
    PngEncoder::new(&mut png_bytes)
        .write_image(rgba, width, height, ExtendedColorType::Rgba8)
        .map_err(|error| CaptureError::Backend(error.to_string()))?;

    Ok(png_bytes)
}

fn map_xcap_error(error: impl std::fmt::Display) -> CaptureError {
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

fn monitor_scale_factor(monitor: &Monitor) -> f64 {
    monitor.scale_factor().unwrap_or(1.0) as f64
}

fn is_xcreener_window(window: &Window) -> bool {
    if window.pid().ok() == Some(std::process::id()) {
        return true;
    }

    if let Ok(app_name) = window.app_name() {
        if app_name.eq_ignore_ascii_case("Xcreener") {
            return true;
        }
    }

    if let Ok(title) = window.title() {
        if title.eq_ignore_ascii_case("Xcreener Capture") {
            return true;
        }
    }

    false
}

fn window_info_matches(window: &Window, target: &WindowInfo) -> bool {
    let Ok(x) = window.x() else {
        return false;
    };
    let Ok(y) = window.y() else {
        return false;
    };
    let Ok(width) = window.width() else {
        return false;
    };
    let Ok(height) = window.height() else {
        return false;
    };

    let title_matches = window
        .title()
        .ok()
        .is_some_and(|title| title == target.title);

    let tolerance = 12;
    title_matches
        && x.abs_diff(target.x) <= tolerance
        && y.abs_diff(target.y) <= tolerance
        && width.abs_diff(target.width) <= tolerance
        && height.abs_diff(target.height) <= tolerance
}

pub(crate) fn resolve_window(target: &WindowInfo) -> Result<Window, CaptureError> {
    let windows = Window::all().map_err(map_xcap_error)?;

    if let Some(window) = windows.iter().find(|window| {
        window.id().ok().map(u64::from) == Some(target.id) && !is_xcreener_window(window)
    }) {
        return Ok(window.clone());
    }

    windows
        .into_iter()
        .filter(|window| !is_xcreener_window(window))
        .find(|window| window_info_matches(window, target))
        .ok_or(CaptureError::WindowNotFound(target.id))
}

pub(crate) fn capture_xcap_window(window: &Window) -> Result<Vec<u8>, CaptureError> {
    let image = window.capture_image().map_err(map_xcap_error)?;
    encode_png(image.as_raw(), image.width(), image.height())
}

pub fn list_monitors() -> Result<Vec<MonitorInfo>, CaptureError> {
    Monitor::all()
        .map_err(map_xcap_error)?
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            Ok(MonitorInfo {
                id: index as u32,
                name: monitor.name().map_err(map_xcap_error)?,
                x: monitor.x().map_err(map_xcap_error)?,
                y: monitor.y().map_err(map_xcap_error)?,
                width: monitor.width().map_err(map_xcap_error)?,
                height: monitor.height().map_err(map_xcap_error)?,
                scale_factor: monitor_scale_factor(&monitor),
                is_primary: monitor.is_primary().map_err(map_xcap_error)?,
            })
        })
        .collect()
}

pub fn list_windows() -> Result<Vec<WindowInfo>, CaptureError> {
    Window::all()
        .map_err(map_xcap_error)?
        .into_iter()
        .filter(|window| !is_xcreener_window(window))
        .filter_map(|window| {
            let title = window.title().ok()?;
            if title.is_empty() {
                return None;
            }

            let width = window.width().ok()?;
            let height = window.height().ok()?;
            if width == 0 || height == 0 {
                return None;
            }

            Some(Ok(WindowInfo {
                id: u64::from(window.id().ok()?),
                title,
                x: window.x().ok()?,
                y: window.y().ok()?,
                width,
                height,
            }))
        })
        .collect()
}

pub fn get_window_at_point(x: i32, y: i32) -> Result<Option<WindowInfo>, CaptureError> {
    let windows = list_windows()?;

    Ok(windows.into_iter().rev().find(|window| {
        let right = window.x.saturating_add(window.width as i32);
        let bottom = window.y.saturating_add(window.height as i32);
        x >= window.x && x < right && y >= window.y && y < bottom
    }))
}

pub fn get_overlay_bounds() -> Result<CaptureOverlayBounds, CaptureError> {
    let monitors = list_monitors()?;
    if monitors.is_empty() {
        return Err(CaptureError::NoDisplays);
    }

    let min_x = monitors.iter().map(|monitor| monitor.x).min().unwrap_or(0);
    let min_y = monitors.iter().map(|monitor| monitor.y).min().unwrap_or(0);
    let max_x = monitors
        .iter()
        .map(|monitor| monitor.x.saturating_add(monitor.width as i32))
        .max()
        .unwrap_or(0);
    let max_y = monitors
        .iter()
        .map(|monitor| monitor.y.saturating_add(monitor.height as i32))
        .max()
        .unwrap_or(0);

    Ok(CaptureOverlayBounds {
        x: min_x,
        y: min_y,
        width: (max_x - min_x).max(0) as u32,
        height: (max_y - min_y).max(0) as u32,
    })
}

pub(crate) fn find_monitor_for_region<'a>(
    monitors: &'a [MonitorInfo],
    region: &Rect,
) -> Option<&'a MonitorInfo> {
    let center_x = region.x + (region.width as i32 / 2);
    let center_y = region.y + (region.height as i32 / 2);

    monitors.iter().find(|monitor| {
        let right = monitor.x.saturating_add(monitor.width as i32);
        let bottom = monitor.y.saturating_add(monitor.height as i32);
        center_x >= monitor.x && center_x < right && center_y >= monitor.y && center_y < bottom
    })
}

/// macOS reports monitor geometry in points while `capture_image` returns device pixels.
/// Scaling captures to the densest monitor keeps Retina pixels instead of halving them.
fn capture_pixel_scale(monitors: &[MonitorInfo]) -> f64 {
    if cfg!(target_os = "macos") {
        monitors
            .iter()
            .map(|monitor| monitor.scale_factor)
            .fold(1.0, f64::max)
    } else {
        1.0
    }
}

fn scale_px(value: u32, scale: f64) -> u32 {
    (f64::from(value) * scale).round() as u32
}

fn normalize_monitor_image(image: RgbaImage, width: u32, height: u32) -> RgbaImage {
    if image.width() == width && image.height() == height {
        image
    } else {
        imageops::resize(&image, width, height, imageops::FilterType::Triangle)
    }
}

pub fn capture_desktop_preview() -> Result<Vec<u8>, CaptureError> {
    #[cfg(target_os = "macos")]
    platform::ensure_screen_capture_permission()?;

    let monitors = list_monitors()?;
    let bounds = get_overlay_bounds()?;

    if bounds.width == 0 || bounds.height == 0 {
        return Err(CaptureError::InvalidDimensions);
    }

    let scale = capture_pixel_scale(&monitors);
    let canvas_width = scale_px(bounds.width, scale);
    let canvas_height = scale_px(bounds.height, scale);
    let mut canvas = RgbaImage::new(canvas_width, canvas_height);

    for monitor_info in &monitors {
        let monitor_image = {
            #[cfg(target_os = "windows")]
            {
                platform::capture_monitor_image(monitor_info)?
            }
            #[cfg(not(target_os = "windows"))]
            {
                let xcap_monitors = Monitor::all().map_err(map_xcap_error)?;
                let xcap_monitor = xcap_monitors
                    .get(monitor_info.id as usize)
                    .ok_or(CaptureError::DisplayNotFound(monitor_info.id))?;
                normalize_monitor_image(
                    xcap_monitor.capture_image().map_err(map_xcap_error)?,
                    scale_px(monitor_info.width, scale),
                    scale_px(monitor_info.height, scale),
                )
            }
        };
        let dest_x = (f64::from(monitor_info.x - bounds.x) * scale).round() as i64;
        let dest_y = (f64::from(monitor_info.y - bounds.y) * scale).round() as i64;
        imageops::replace(&mut canvas, &monitor_image, dest_x, dest_y);
    }

    encode_png(canvas.as_raw(), canvas_width, canvas_height)
}

pub fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, CaptureError> {
    let monitors = list_monitors()?;
    let region = Rect {
        x,
        y,
        width,
        height,
    };
    validate_region(&region, &monitors)?;

    let monitor = find_monitor_for_region(&monitors, &region)
        .or(monitors.first())
        .ok_or(CaptureError::NoDisplays)?;

    let xcap_monitors = Monitor::all().map_err(map_xcap_error)?;
    let xcap_monitor = xcap_monitors
        .get(monitor.id as usize)
        .ok_or(CaptureError::DisplayNotFound(monitor.id))?;

    let rel_x = (region.x - monitor.x).max(0) as u32;
    let rel_y = (region.y - monitor.y).max(0) as u32;
    let image = xcap_monitor
        .capture_region(rel_x, rel_y, region.width, region.height)
        .map_err(map_xcap_error)?;

    encode_png(image.as_raw(), image.width(), image.height())
}

pub fn capture_window(window_id: u64) -> Result<Vec<u8>, CaptureError> {
    let windows = list_windows()?;
    validate_window_id(window_id, &windows)?;

    let xcap_windows = Window::all().map_err(map_xcap_error)?;
    let window = xcap_windows
        .into_iter()
        .find(|window| {
            window
                .id()
                .ok()
                .map(u64::from)
                .map(|id| id == window_id)
                .unwrap_or(false)
        })
        .ok_or(CaptureError::WindowNotFound(window_id))?;

    #[cfg_attr(not(target_os = "macos"), allow(unused_mut))]
    let mut image = window.capture_image().map_err(map_xcap_error)?;
    #[cfg(target_os = "macos")]
    {
        unpremultiply_alpha(&mut image);
        flatten_window_corners(&mut image);
    }
    encode_png(image.as_raw(), image.width(), image.height())
}

/// CGWindowListCreateImage returns premultiplied pixels; PNG stores straight alpha.
/// Without this the anti-aliased rounded window corners get a dark fringe.
#[cfg(target_os = "macos")]
fn unpremultiply_alpha(image: &mut RgbaImage) {
    for pixel in image.pixels_mut() {
        let alpha = u16::from(pixel[3]);
        if alpha == 0 || alpha == 255 {
            continue;
        }
        for channel in 0..3 {
            let value = (u16::from(pixel[channel]) * 255 + alpha / 2) / alpha;
            pixel[channel] = value.min(255) as u8;
        }
    }
}

/// Pixels inward from a row's first opaque pixel to sample the fill color, past the
/// window's anti-aliased outline.
#[cfg(target_os = "macos")]
const CORNER_FILL_INSET: usize = 4;

/// macOS window captures have transparent rounded corners. Fill each row's transparent
/// ends with that row's edge color so the capture is a plain rectangle; the editor's
/// corner radius is the only rounding. Remaining translucent pixels (vibrancy) become opaque.
#[cfg(target_os = "macos")]
fn flatten_window_corners(image: &mut RgbaImage) {
    let width = image.width() as usize;
    for y in 0..image.height() {
        let alphas: Vec<u8> = (0..width)
            .map(|x| image.get_pixel(x as u32, y)[3])
            .collect();
        let Some(first) = alphas.iter().position(|&alpha| alpha == 255) else {
            continue;
        };
        let last = alphas
            .iter()
            .rposition(|&alpha| alpha == 255)
            .unwrap_or(first);

        let left_fill = *image.get_pixel((first + CORNER_FILL_INSET).min(last) as u32, y);
        let right_fill =
            *image.get_pixel(last.saturating_sub(CORNER_FILL_INSET).max(first) as u32, y);
        for x in (0..first).chain(last + 1..width) {
            let fill = if x < first { left_fill } else { right_fill };
            let pixel = image.get_pixel_mut(x as u32, y);
            let alpha = u16::from(pixel[3]);
            for channel in 0..3 {
                let blended = (u16::from(pixel[channel]) * alpha
                    + u16::from(fill[channel]) * (255 - alpha)
                    + 127)
                    / 255;
                pixel[channel] = blended as u8;
            }
            pixel[3] = 255;
        }
    }

    for pixel in image.pixels_mut() {
        pixel[3] = 255;
    }
}

pub fn capture_fullscreen(display_id: u32) -> Result<Vec<u8>, CaptureError> {
    let monitors = list_monitors()?;
    validate_monitor_id(display_id, &monitors)?;

    let monitor_info = monitors
        .get(display_id as usize)
        .ok_or(CaptureError::DisplayNotFound(display_id))?;

    let xcap_monitors = Monitor::all().map_err(map_xcap_error)?;
    let monitor = xcap_monitors
        .get(display_id as usize)
        .ok_or(CaptureError::DisplayNotFound(display_id))?;
    let scale = capture_pixel_scale(std::slice::from_ref(monitor_info));
    let image = normalize_monitor_image(
        monitor.capture_image().map_err(map_xcap_error)?,
        scale_px(monitor_info.width, scale),
        scale_px(monitor_info.height, scale),
    );

    encode_png(image.as_raw(), image.width(), image.height())
}

#[allow(dead_code)]
pub fn local_to_screen(local_x: i32, local_y: i32, bounds: &CaptureOverlayBounds) -> (i32, i32) {
    (local_x + bounds.x, local_y + bounds.y)
}

#[allow(dead_code)]
pub fn screen_to_local(screen_x: i32, screen_y: i32, bounds: &CaptureOverlayBounds) -> (i32, i32) {
    (screen_x - bounds.x, screen_y - bounds.y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlay_bounds_cover_monitors() {
        let bounds = get_overlay_bounds_from_monitors(&[
            MonitorInfo {
                id: 0,
                name: "A".into(),
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
                scale_factor: 1.0,
                is_primary: true,
            },
            MonitorInfo {
                id: 1,
                name: "B".into(),
                x: 1920,
                y: 0,
                width: 2560,
                height: 1440,
                scale_factor: 2.0,
                is_primary: false,
            },
        ]);

        assert_eq!(bounds.x, 0);
        assert_eq!(bounds.y, 0);
        assert_eq!(bounds.width, 4480);
        assert_eq!(bounds.height, 1440);
    }

    #[test]
    fn converts_between_local_and_screen_coordinates() {
        let bounds = CaptureOverlayBounds {
            x: 1920,
            y: 0,
            width: 2560,
            height: 1440,
        };

        assert_eq!(local_to_screen(120, 80, &bounds), (2040, 80));
        assert_eq!(screen_to_local(2040, 80, &bounds), (120, 80));
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn capture_scale_uses_densest_monitor_on_macos() {
        let monitor = |scale_factor| MonitorInfo {
            id: 0,
            name: "A".into(),
            x: 0,
            y: 0,
            width: 1512,
            height: 982,
            scale_factor,
            is_primary: true,
        };

        let scale = capture_pixel_scale(&[monitor(1.0), monitor(2.0)]);
        assert_eq!(scale, 2.0);
        assert_eq!(scale_px(1512, scale), 3024);
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn unpremultiplies_partial_alpha() {
        let mut image = RgbaImage::from_raw(
            3,
            1,
            vec![
                0, 0, 0, 0, // transparent
                64, 32, 0, 128, // half alpha, premultiplied
                10, 20, 30, 255, // opaque
            ],
        )
        .unwrap();

        unpremultiply_alpha(&mut image);

        assert_eq!(
            image.as_raw(),
            &vec![0, 0, 0, 0, 128, 64, 0, 128, 10, 20, 30, 255]
        );
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn flattens_transparent_window_corners_with_row_color() {
        // One row: transparent, half-alpha, then opaque blue, ending transparent.
        let mut row = vec![0, 0, 0, 0, 255, 255, 255, 128];
        row.extend([0, 0, 200, 255].repeat(6));
        row.extend([0, 0, 0, 0]);
        let mut image = RgbaImage::from_raw(9, 1, row).unwrap();

        flatten_window_corners(&mut image);

        assert_eq!(image.get_pixel(0, 0).0, [0, 0, 200, 255]);
        assert_eq!(image.get_pixel(1, 0).0, [128, 128, 228, 255]);
        assert_eq!(image.get_pixel(8, 0).0, [0, 0, 200, 255]);
        assert!(image.pixels().all(|pixel| pixel[3] == 255));
    }

    fn get_overlay_bounds_from_monitors(monitors: &[MonitorInfo]) -> CaptureOverlayBounds {
        let min_x = monitors.iter().map(|monitor| monitor.x).min().unwrap_or(0);
        let min_y = monitors.iter().map(|monitor| monitor.y).min().unwrap_or(0);
        let max_x = monitors
            .iter()
            .map(|monitor| monitor.x.saturating_add(monitor.width as i32))
            .max()
            .unwrap_or(0);
        let max_y = monitors
            .iter()
            .map(|monitor| monitor.y.saturating_add(monitor.height as i32))
            .max()
            .unwrap_or(0);

        CaptureOverlayBounds {
            x: min_x,
            y: min_y,
            width: (max_x - min_x).max(0) as u32,
            height: (max_y - min_y).max(0) as u32,
        }
    }
}
