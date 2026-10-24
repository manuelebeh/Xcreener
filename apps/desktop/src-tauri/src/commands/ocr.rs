use super::raw_ipc::{body_bytes, header};
use crate::ocr::{self, types::RecognizeTextOptions, types::TextLine};
use tauri::ipc::Request;

/// Body: PNG bytes. Header `options`: `RecognizeTextOptions` as JSON.
#[tauri::command]
pub async fn recognize_text_command(request: Request<'_>) -> Result<Vec<TextLine>, String> {
    let options: RecognizeTextOptions =
        serde_json::from_str(header(&request, "options")?).map_err(|error| error.to_string())?;
    let image_data = body_bytes(&request)?;
    tauri::async_runtime::spawn_blocking(move || {
        ocr::recognize_text_with_options(&image_data, &options)
    })
    .await
    .map_err(|error| error.to_string())?
}
