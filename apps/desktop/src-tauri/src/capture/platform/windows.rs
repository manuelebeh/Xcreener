use crate::capture::{CaptureError, MonitorInfo, Rect};
use image::{imageops, RgbaImage};
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HGDIOBJ, SRCCOPY,
};
use windows::Win32::UI::WindowsAndMessaging::GetDesktopWindow;

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

        let blit_result = BitBlt(
            hdc_mem,
            0,
            0,
            width,
            height,
            hdc_screen,
            x,
            y,
            SRCCOPY,
        );

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

pub fn capture_monitor_image(monitor_info: &MonitorInfo) -> Result<RgbaImage, CaptureError> {
    let scale = monitor_info.scale_factor;
    let x = logical_to_physical_i32(monitor_info.x, scale);
    let y = logical_to_physical_i32(monitor_info.y, scale);
    let width = logical_to_physical_i32(monitor_info.width as i32, scale);
    let height = logical_to_physical_i32(monitor_info.height as i32, scale);

    let captured = gdi_capture_area(x, y, width, height)?;
    Ok(downscale_to_logical(
        captured,
        monitor_info.width,
        monitor_info.height,
    ))
}

pub fn capture_screen_region(region: &Rect) -> Result<RgbaImage, CaptureError> {
    let monitors = crate::capture::list_monitors()?;
    let monitor = crate::capture::find_monitor_for_region(&monitors, region)
        .or(monitors.first())
        .ok_or(CaptureError::NoDisplays)?;

    let scale = monitor.scale_factor;
    let x = logical_to_physical_i32(region.x, scale);
    let y = logical_to_physical_i32(region.y, scale);
    let width = logical_to_physical_i32(region.width as i32, scale);
    let height = logical_to_physical_i32(region.height as i32, scale);

    let captured = gdi_capture_area(x, y, width, height)?;
    Ok(downscale_to_logical(captured, region.width, region.height))
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
