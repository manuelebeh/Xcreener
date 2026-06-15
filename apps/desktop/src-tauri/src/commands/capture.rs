#[tauri::command]
pub async fn capture_region(
    _x: i32,
    _y: i32,
    _width: u32,
    _height: u32,
) -> Result<Vec<u8>, String> {
    Err("capture_region not implemented yet".into())
}

#[tauri::command]
pub async fn capture_window(_window_id: u64) -> Result<Vec<u8>, String> {
    Err("capture_window not implemented yet".into())
}

#[tauri::command]
pub async fn capture_fullscreen(_display_id: u32) -> Result<Vec<u8>, String> {
    Err("capture_fullscreen not implemented yet".into())
}
