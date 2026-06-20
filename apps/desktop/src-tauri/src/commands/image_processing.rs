use crate::image_processing::{compress_export_bytes, crop_image, detect_content_bounds};
use crate::ocr::types::ContentBounds;

#[tauri::command]
pub async fn detect_content_bounds_command(image_data: Vec<u8>) -> Result<ContentBounds, String> {
    tauri::async_runtime::spawn_blocking(move || detect_content_bounds(&image_data))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn crop_image_command(
    image_data: Vec<u8>,
    bounds: ContentBounds,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || crop_image(&image_data, &bounds))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn compress_export_bytes_command(
    image_data: Vec<u8>,
    format: String,
    quality: u8,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        compress_export_bytes(image_data, &format, quality)
    })
    .await
    .map_err(|error| error.to_string())?
}
