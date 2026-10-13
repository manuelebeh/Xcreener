use crate::capture::CaptureError;
use xcap::Window;

// Window focus and scroll injection are not implemented on Linux. Scrolling capture still runs:
// the first frame repeats, the stitcher sees identical frames and stops.

pub fn focus_xcap_window(_window: &Window) -> Result<(), CaptureError> {
    Ok(())
}

pub fn scroll_xcap_window_to_top(_window: &Window) -> Result<(), CaptureError> {
    Ok(())
}

pub fn scroll_xcap_window_page_down(_window: &Window) -> Result<(), CaptureError> {
    Ok(())
}
