use super::raw_ipc::body_bytes;
use crate::classification::classify_content;
use tauri::ipc::Request;

/// Body: PNG bytes.
#[tauri::command]
pub async fn classify_content_command(
    request: Request<'_>,
) -> Result<crate::classification::ClassificationResult, String> {
    let image_data = body_bytes(&request)?;
    tauri::async_runtime::spawn_blocking(move || classify_content(&image_data))
        .await
        .map_err(|error| error.to_string())?
}
