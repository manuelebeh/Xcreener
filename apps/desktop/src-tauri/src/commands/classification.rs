use crate::classification::classify_content;

#[tauri::command]
pub async fn classify_content_command(
    image_data: Vec<u8>,
) -> Result<crate::classification::ClassificationResult, String> {
    tauri::async_runtime::spawn_blocking(move || classify_content(&image_data))
        .await
        .map_err(|error| error.to_string())?
}
