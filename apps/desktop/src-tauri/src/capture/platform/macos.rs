use crate::capture::CaptureError;
use objc2_core_graphics::{CGPreflightScreenCaptureAccess, CGRequestScreenCaptureAccess};
use std::ffi::c_void;
use xcap::Window;

type CGEventSourceRef = *const c_void;
type CGEventRef = *const c_void;

#[repr(C)]
#[derive(Copy, Clone)]
struct CGPoint {
    x: f64,
    y: f64,
}

const K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE: u32 = 1;
const K_CG_HID_EVENT_TAP: u32 = 0;
const K_CG_EVENT_FLAG_MASK_COMMAND: u64 = 1 << 20;

const K_VK_HOME: u16 = 0x73;
const K_VK_PAGE_DOWN: u16 = 0x79;
const K_VK_UP_ARROW: u16 = 0x7E;

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceCreate(state_id: u32) -> CGEventSourceRef;
    fn CGEventCreateKeyboardEvent(
        source: CGEventSourceRef,
        virtual_key: u16,
        key_down: bool,
    ) -> CGEventRef;
    fn CGEventSetFlags(event: CGEventRef, flags: u64);
    fn CGEventSetLocation(event: CGEventRef, location: CGPoint);
    fn CGEventPost(tap: u32, event: CGEventRef);
    fn CGMainDisplayID() -> u32;
    fn CGDisplayPixelsHigh(display: u32) -> usize;
}

/// Ensures Screen Recording permission before any capture attempt.
pub fn ensure_screen_capture_permission() -> Result<(), CaptureError> {
    if CGPreflightScreenCaptureAccess() {
        return Ok(());
    }

    let _ = CGRequestScreenCaptureAccess();

    if CGPreflightScreenCaptureAccess() {
        return Ok(());
    }

    Err(CaptureError::PermissionDenied)
}

pub fn focus_xcap_window(window: &Window) -> Result<(), CaptureError> {
    let pid = match window.pid() {
        Ok(pid) => pid,
        Err(_) => return Ok(()),
    };

    let Some(app) =
        objc2_app_kit::NSRunningApplication::runningApplicationWithProcessIdentifier(pid as i32)
    else {
        return Ok(());
    };

    let _ = app.activateWithOptions(objc2_app_kit::NSApplicationActivationOptions::ActivateAllWindows);
    Ok(())
}

fn window_event_center(window: &Window) -> Result<CGPoint, CaptureError> {
    let x = window.x().map_err(|error| CaptureError::Backend(error.to_string()))?;
    let y = window.y().map_err(|error| CaptureError::Backend(error.to_string()))?;
    let width = window.width().map_err(|error| CaptureError::Backend(error.to_string()))?;
    let height = window.height().map_err(|error| CaptureError::Backend(error.to_string()))?;

    let display_height = unsafe { CGDisplayPixelsHigh(CGMainDisplayID()) as f64 };
    Ok(CGPoint {
        x: f64::from(x) + f64::from(width) / 2.0,
        y: display_height - f64::from(y) - f64::from(height) / 2.0,
    })
}

fn post_key_at(source: CGEventSourceRef, center: CGPoint, keycode: u16, flags: u64) -> Result<(), CaptureError> {
    unsafe {
        for key_down in [true, false] {
            let event = CGEventCreateKeyboardEvent(source, keycode, key_down);
            if event.is_null() {
                return Err(CaptureError::Backend(
                    "CGEventCreateKeyboardEvent failed".into(),
                ));
            }

            CGEventSetFlags(event, flags);
            CGEventSetLocation(event, center);
            CGEventPost(K_CG_HID_EVENT_TAP, event);
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
    }

    Ok(())
}

/// Scroll to top (Home + Cmd+Up) before chunked viewport capture.
pub fn scroll_xcap_window_to_top(window: &Window) -> Result<(), CaptureError> {
    focus_xcap_window(window)?;
    std::thread::sleep(std::time::Duration::from_millis(150));

    let center = window_event_center(window)?;

    unsafe {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);
        if source.is_null() {
            return Err(CaptureError::Backend("CGEventSourceCreate failed".into()));
        }

        for _ in 0..5 {
            post_key_at(source, center, K_VK_HOME, 0)?;
            std::thread::sleep(std::time::Duration::from_millis(60));
        }

        post_key_at(source, center, K_VK_UP_ARROW, K_CG_EVENT_FLAG_MASK_COMMAND)?;
    }

    Ok(())
}

/// One viewport step — Page Down (≈ one screenful in browsers and most apps).
pub fn scroll_xcap_window_page_down(window: &Window) -> Result<(), CaptureError> {
    focus_xcap_window(window)?;

    let center = window_event_center(window)?;

    unsafe {
        let source = CGEventSourceCreate(K_CG_EVENT_SOURCE_STATE_HID_SYSTEM_STATE);
        if source.is_null() {
            return Err(CaptureError::Backend("CGEventSourceCreate failed".into()));
        }

        post_key_at(source, center, K_VK_PAGE_DOWN, 0)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ensure_screen_capture_permission;

    #[test]
    fn ensure_screen_capture_permission_does_not_panic() {
        let _ = ensure_screen_capture_permission();
    }
}
