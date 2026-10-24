use std::collections::HashMap;

use rusqlite::{Connection, OptionalExtension};
use tauri::State;

use super::{with_conn, Db};

pub(super) fn insert_defaults(
    conn: &Connection,
    defaults: &HashMap<String, String>,
) -> rusqlite::Result<()> {
    for (key, value) in defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            [key, value],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub async fn settings_get(db: State<'_, Db>, key: String) -> Result<Option<String>, String> {
    with_conn(&db, |conn| {
        conn.query_row("SELECT value FROM settings WHERE key = ?1", [&key], |row| {
            row.get(0)
        })
        .optional()
    })
}

#[tauri::command]
pub async fn settings_set(db: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [&key, &value],
        )
        .map(|_| ())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_do_not_overwrite_existing_values() {
        let conn = crate::db::test_connection();
        conn.execute("INSERT INTO settings (key, value) VALUES ('theme', 'dark')", [])
            .unwrap();

        let defaults = HashMap::from([
            ("theme".to_string(), "system".to_string()),
            ("locale".to_string(), "en".to_string()),
        ]);
        insert_defaults(&conn, &defaults).unwrap();

        let value = |key: &str| -> String {
            conn.query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
                row.get(0)
            })
            .unwrap()
        };
        assert_eq!(value("theme"), "dark");
        assert_eq!(value("locale"), "en");
    }
}
