use crate::capture::CaptureError;
use objc2_core_graphics::{CGPreflightScreenCaptureAccess, CGRequestScreenCaptureAccess};

/// Ensures Screen Recording permission before any capture attempt.
/// Triggers the macOS permission flow when needed, without opening the overlay.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_screen_capture_permission_does_not_panic() {
        let _ = ensure_screen_capture_permission();
    }
}
