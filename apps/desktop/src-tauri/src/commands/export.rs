#[tauri::command]
pub async fn export_image(
    _image_data: Vec<u8>,
    _format: String,
    _quality: u8,
    _path: String,
) -> Result<(), String> {
    Err("export_image not implemented yet".into())
}
