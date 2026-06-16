use crate::redaction::detect_sensitive_regions;

#[tauri::command]
pub async fn detect_sensitive_data(image_data: Vec<u8>) -> Result<Vec<crate::redaction::SensitiveRegion>, String> {
    tauri::async_runtime::spawn_blocking(move || detect_sensitive_regions(&image_data))
        .await
        .map_err(|error| error.to_string())?
}
