use crate::image_processing::{analyze_content, compress_export_bytes};
use crate::ocr::types::ContentAnalysis;

#[tauri::command]
pub async fn analyze_content_command(image_data: Vec<u8>) -> Result<ContentAnalysis, String> {
    tauri::async_runtime::spawn_blocking(move || analyze_content(&image_data))
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
