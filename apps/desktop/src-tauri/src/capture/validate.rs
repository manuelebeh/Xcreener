use crate::capture::types::{MonitorInfo, Rect};

use super::CaptureError;

pub fn validate_region(region: &Rect, monitors: &[MonitorInfo]) -> Result<(), CaptureError> {
    if region.width == 0 || region.height == 0 {
        return Err(CaptureError::InvalidDimensions);
    }

    if monitors.is_empty() {
        return Err(CaptureError::NoDisplays);
    }

    let region_right = region.x.saturating_add(region.width as i32);
    let region_bottom = region.y.saturating_add(region.height as i32);

    let intersects = monitors.iter().any(|monitor| {
        let monitor_right = monitor.x.saturating_add(monitor.width as i32);
        let monitor_bottom = monitor.y.saturating_add(monitor.height as i32);

        region.x < monitor_right
            && region_right > monitor.x
            && region.y < monitor_bottom
            && region_bottom > monitor.y
    });

    if !intersects {
        return Err(CaptureError::RegionOutOfBounds);
    }

    Ok(())
}

pub fn validate_monitor_id(display_id: u32, monitors: &[MonitorInfo]) -> Result<(), CaptureError> {
    if monitors.iter().any(|monitor| monitor.id == display_id) {
        Ok(())
    } else {
        Err(CaptureError::DisplayNotFound(display_id))
    }
}

pub fn validate_window_id(
    window_id: u64,
    windows: &[super::types::WindowInfo],
) -> Result<(), CaptureError> {
    if windows.iter().any(|window| window.id == window_id) {
        Ok(())
    } else {
        Err(CaptureError::WindowNotFound(window_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_monitor(id: u32, x: i32, y: i32, width: u32, height: u32) -> MonitorInfo {
        MonitorInfo {
            id,
            name: format!("Monitor {id}"),
            x,
            y,
            width,
            height,
            scale_factor: 2.0,
            is_primary: id == 0,
        }
    }

    #[test]
    fn rejects_zero_dimensions() {
        let monitors = vec![sample_monitor(0, 0, 0, 1920, 1080)];
        let region = Rect {
            x: 0,
            y: 0,
            width: 0,
            height: 100,
        };

        assert!(matches!(
            validate_region(&region, &monitors),
            Err(CaptureError::InvalidDimensions)
        ));
    }

    #[test]
    fn accepts_region_inside_monitor() {
        let monitors = vec![sample_monitor(0, 0, 0, 1920, 1080)];
        let region = Rect {
            x: 100,
            y: 100,
            width: 400,
            height: 300,
        };

        assert!(validate_region(&region, &monitors).is_ok());
    }

    #[test]
    fn accepts_region_spanning_monitors() {
        let monitors = vec![
            sample_monitor(0, 0, 0, 1920, 1080),
            sample_monitor(1, 1920, 0, 1920, 1080),
        ];
        let region = Rect {
            x: 1800,
            y: 100,
            width: 400,
            height: 300,
        };

        assert!(validate_region(&region, &monitors).is_ok());
    }

    #[test]
    fn rejects_region_outside_monitors() {
        let monitors = vec![sample_monitor(0, 0, 0, 1920, 1080)];
        let region = Rect {
            x: 5000,
            y: 5000,
            width: 100,
            height: 100,
        };

        assert!(matches!(
            validate_region(&region, &monitors),
            Err(CaptureError::RegionOutOfBounds)
        ));
    }
}
