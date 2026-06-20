use crate::ocr::{self, types::RecognizeTextOptions, types::TextLine};

#[tauri::command]
pub async fn recognize_text_command(
    image_data: Vec<u8>,
    options: RecognizeTextOptions,
) -> Result<Vec<TextLine>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ocr::recognize_text_with_options(&image_data, &options)
    })
    .await
    .map_err(|error| error.to_string())?
}
