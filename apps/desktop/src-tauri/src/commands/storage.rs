#[tauri::command]
pub async fn get_setting(_key: String) -> Result<Option<String>, String> {
    Err("get_setting: use frontend SQLite helpers in Sprint 0.3".into())
}

#[tauri::command]
pub async fn set_setting(_key: String, _value: String) -> Result<(), String> {
    Err("set_setting: use frontend SQLite helpers in Sprint 0.3".into())
}
