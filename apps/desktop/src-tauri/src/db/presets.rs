use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use super::{with_conn, Db};

/// Same shape as `CustomPresetRow` in `src/db/presets.ts`.
#[derive(Debug, Serialize)]
pub struct CustomPresetRow {
    id: i64,
    name: String,
    width: Option<i64>,
    height: Option<i64>,
    aspect_ratio: Option<String>,
    background: String,
    padding: i64,
    border_radius: i64,
    shadow: String,
}

/// Validated and serialized by `createCustomPreset` before it reaches Rust.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePresetInput {
    name: String,
    width: i64,
    height: i64,
    aspect_ratio: String,
    /// JSON.
    background: String,
    padding: i64,
    border_radius: i64,
    /// JSON.
    shadow: String,
}

#[tauri::command]
pub async fn presets_list(db: State<'_, Db>) -> Result<Vec<CustomPresetRow>, String> {
    with_conn(&db, |conn| {
        let mut statement = conn.prepare(
            "SELECT id, name, width, height, aspect_ratio, background, padding, border_radius, shadow
             FROM custom_presets ORDER BY created_at DESC",
        )?;
        let rows = statement.query_map([], |row| {
            Ok(CustomPresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                width: row.get(2)?,
                height: row.get(3)?,
                aspect_ratio: row.get(4)?,
                background: row.get(5)?,
                padding: row.get(6)?,
                border_radius: row.get(7)?,
                shadow: row.get(8)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub async fn presets_create(db: State<'_, Db>, input: CreatePresetInput) -> Result<i64, String> {
    with_conn(&db, |conn| {
        conn.execute(
            "INSERT INTO custom_presets (name, width, height, aspect_ratio, background, padding, border_radius, shadow)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                input.name,
                input.width,
                input.height,
                input.aspect_ratio,
                input.background,
                input.padding,
                input.border_radius,
                input.shadow,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    })
}

#[tauri::command]
pub async fn presets_delete(db: State<'_, Db>, id: i64) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute("DELETE FROM custom_presets WHERE id = ?1", [id])
            .map(|_| ())
    })
}
