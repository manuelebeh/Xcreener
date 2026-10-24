use super::raw_ipc::body_bytes;
use crate::redaction::detect_sensitive_regions;
use tauri::ipc::Request;

/// Body: PNG bytes.
#[tauri::command]
pub async fn detect_sensitive_data(
    request: Request<'_>,
) -> Result<Vec<crate::redaction::SensitiveRegion>, String> {
    let image_data = body_bytes(&request)?;
    tauri::async_runtime::spawn_blocking(move || detect_sensitive_regions(&image_data))
        .await
        .map_err(|error| error.to_string())?
}
