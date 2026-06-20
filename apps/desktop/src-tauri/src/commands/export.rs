#[tauri::command]
pub async fn export_image(
    image_data: Vec<u8>,
    format: String,
    quality: u8,
    path: String,
) -> Result<(), String> {
    let compressed = crate::image_processing::compress_export_bytes(image_data, &format, quality)?;
    std::fs::write(path, compressed).map_err(|error| error.to_string())
}
