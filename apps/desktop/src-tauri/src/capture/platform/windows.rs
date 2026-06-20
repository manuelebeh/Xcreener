use crate::capture::{CaptureError, MonitorInfo};
use image::{imageops, RgbaImage};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::{GetDesktopWindow, SetForegroundWindow};

const VK_HOME: u16 = 0x24;
const VK_NEXT: u16 = 0x22;

pub fn focus_xcap_window(window: &xcap::Window) -> Result<(), CaptureError> {
    let window_id = window.id().map_err(|error| CaptureError::Backend(error.to_string()))?;

    unsafe {
        let hwnd = HWND(window_id as isize);
        if hwnd.0 == 0 {
            return Ok(());
        }

        let _ = SetForegroundWindow(hwnd);
    }

    Ok(())
}

fn send_virtual_key(vk: u16) -> Result<(), CaptureError> {
    let down = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                ..Default::default()
            },
        },
    };
    let up = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                dwFlags: KEYEVENTF_KEYUP,
                ..Default::default()
            },
        },
    };

    unsafe {
        let sent = SendInput(&[down, up], std::mem::size_of::<INPUT>() as i32);
        if sent == 0 {
            return Err(CaptureError::Backend("SendInput key failed".into()));
        }
    }

    Ok(())
}

pub fn scroll_xcap_window_to_top(window: &xcap::Window) -> Result<(), CaptureError> {
    focus_xcap_window(window)?;
    std::thread::sleep(std::time::Duration::from_millis(150));

    for _ in 0..5 {
        send_virtual_key(VK_HOME)?;
        std::thread::sleep(std::time::Duration::from_millis(60));
    }

    Ok(())
}

pub fn scroll_xcap_window_page_down(window: &xcap::Window) -> Result<(), CaptureError> {
    focus_xcap_window(window)?;
    send_virtual_key(VK_NEXT)
}

use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HGDIOBJ, SRCCOPY,
};

pub fn logical_to_physical_i32(value: i32, scale: f64) -> i32 {
    (value as f64 * scale).round() as i32
}

fn map_win_err(error: windows::core::Error) -> CaptureError {
    CaptureError::Backend(error.to_string())
}

fn bgra_to_rgba(mut buffer: Vec<u8>) -> Vec<u8> {
    for chunk in buffer.chunks_exact_mut(4) {
        chunk.swap(0, 2);
    }
    buffer
}

fn gdi_capture_area(x: i32, y: i32, width: i32, height: i32) -> Result<RgbaImage, CaptureError> {
    if width <= 0 || height <= 0 {
        return Err(CaptureError::InvalidDimensions);
    }

    unsafe {
        let hwnd = GetDesktopWindow();
        let hdc_screen = GetDC(hwnd);
        if hdc_screen.is_invalid() {
            return Err(CaptureError::Backend("GetDC failed".into()));
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            let _ = ReleaseDC(hwnd, hdc_screen);
            return Err(CaptureError::Backend("CreateCompatibleDC failed".into()));
        }

        let h_bitmap = CreateCompatibleBitmap(hdc_screen, width, height);
        if h_bitmap.is_invalid() {
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(hwnd, hdc_screen);
            return Err(CaptureError::Backend("CreateCompatibleBitmap failed".into()));
        }

        let previous_object = SelectObject(hdc_mem, HGDIOBJ::from(h_bitmap));

        let blit_result = BitBlt(hdc_mem, 0, 0, width, height, hdc_screen, x, y, SRCCOPY);

        if let Err(error) = blit_result {
            let _ = SelectObject(hdc_mem, previous_object);
            let _ = DeleteObject(HGDIOBJ::from(h_bitmap));
            let _ = DeleteDC(hdc_mem);
            let _ = ReleaseDC(hwnd, hdc_screen);
            return Err(map_win_err(error));
        }

        let buffer_size = width * height * 4;
        let mut bitmap_info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height,
                biPlanes: 1,
                biBitCount: 32,
                biSizeImage: buffer_size as u32,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut buffer = vec![0u8; buffer_size as usize];
        let get_bits_ok = GetDIBits(
            hdc_mem,
            h_bitmap,
            0,
            height as u32,
            Some(buffer.as_mut_ptr().cast()),
            &mut bitmap_info,
            DIB_RGB_COLORS,
        ) != 0;

        let _ = SelectObject(hdc_mem, previous_object);
        let _ = DeleteObject(HGDIOBJ::from(h_bitmap));
        let _ = DeleteDC(hdc_mem);
        let _ = ReleaseDC(hwnd, hdc_screen);

        if !get_bits_ok {
            return Err(CaptureError::Backend("GetDIBits failed".into()));
        }

        RgbaImage::from_raw(width as u32, height as u32, bgra_to_rgba(buffer))
            .ok_or_else(|| CaptureError::Backend("invalid capture buffer".into()))
    }
}

fn downscale_to_logical(image: RgbaImage, width: u32, height: u32) -> RgbaImage {
    if image.width() == width && image.height() == height {
        return image;
    }

    imageops::resize(&image, width, height, imageops::FilterType::Triangle)
}

/// Capture one monitor for the frozen desktop preview.
///
/// xcap monitor metadata is in logical virtual-screen coordinates while GDI BitBlt uses
/// physical pixels - always scale before capture, then downsample to logical size.
pub fn capture_monitor_image(monitor_info: &MonitorInfo) -> Result<RgbaImage, CaptureError> {
    let scale = monitor_info.scale_factor;
    let captured = gdi_capture_area(
        logical_to_physical_i32(monitor_info.x, scale),
        logical_to_physical_i32(monitor_info.y, scale),
        logical_to_physical_i32(monitor_info.width as i32, scale),
        logical_to_physical_i32(monitor_info.height as i32, scale),
    )?;
    Ok(downscale_to_logical(
        captured,
        monitor_info.width,
        monitor_info.height,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scales_logical_coordinates_for_hi_dpi() {
        assert_eq!(logical_to_physical_i32(1920, 1.25), 2400);
        assert_eq!(logical_to_physical_i32(1080, 1.25), 1350);
        assert_eq!(logical_to_physical_i32(100, 1.25), 125);
    }
}
