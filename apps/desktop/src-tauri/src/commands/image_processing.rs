use super::raw_ipc::{body_bytes, header};
use crate::image_processing::{analyze_content, compress_export_bytes};
use crate::ocr::types::ContentAnalysis;
use tauri::ipc::{Request, Response};

/// Body: PNG bytes.
#[tauri::command]
pub async fn analyze_content_command(request: Request<'_>) -> Result<ContentAnalysis, String> {
    let image_data = body_bytes(&request)?;
    tauri::async_runtime::spawn_blocking(move || analyze_content(&image_data))
        .await
        .map_err(|error| error.to_string())?
}

/// Body: encoded image. Headers `format` and `quality` (0-100).
#[tauri::command]
pub async fn compress_export_bytes_command(request: Request<'_>) -> Result<Response, String> {
    let format = header(&request, "format")?.to_string();
    let quality: u8 = header(&request, "quality")?
        .parse()
        .map_err(|_| "Invalid quality header".to_string())?;
    let image_data = body_bytes(&request)?;
    tauri::async_runtime::spawn_blocking(move || {
        compress_export_bytes(image_data, &format, quality)
    })
    .await
    .map_err(|error| error.to_string())?
    .map(Response::new)
}
