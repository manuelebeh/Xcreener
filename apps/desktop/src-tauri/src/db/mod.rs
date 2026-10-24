//! Local SQLite library (`snapglow.db`). Rust owns the connection and exposes one typed
//! command per query, so a script in the WebView cannot run arbitrary SQL.

mod captures;
mod collections;
mod migrations;
mod presets;
mod settings;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use rusqlite::Connection;
use tauri::{AppHandle, Manager, State};

pub use captures::{
    captures_delete, captures_get, captures_insert, captures_list, captures_list_by_collection,
    captures_list_by_tag, captures_search, captures_uid_exists, captures_update_ocr_text,
    captures_update_tags,
};
pub use collections::{
    collections_add_capture, collections_create, collections_delete, collections_for_capture,
    collections_list, collections_remove_capture, collections_rename,
};
pub use presets::{presets_create, presets_delete, presets_list};
pub use settings::{settings_get, settings_set};

/// Same file tauri-plugin-sql opened for `sqlite:snapglow.db`, so existing libraries carry over.
const DB_FILENAME: &str = "snapglow.db";

#[derive(Default)]
pub struct Db(Mutex<Option<Connection>>);

/// Settings that sqlx (behind tauri-plugin-sql) applied to every connection.
fn configure(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.busy_timeout(Duration::from_secs(5))
}

fn open(app: &AppHandle) -> Result<Connection, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let conn = Connection::open(dir.join(DB_FILENAME)).map_err(|error| error.to_string())?;
    configure(&conn).map_err(|error| error.to_string())?;
    Ok(conn)
}

pub(crate) fn with_conn<T>(
    db: &Db,
    f: impl FnOnce(&Connection) -> rusqlite::Result<T>,
) -> Result<T, String> {
    let guard = db.0.lock().unwrap_or_else(|error| error.into_inner());
    let conn = guard
        .as_ref()
        .ok_or_else(|| "Database is not initialized".to_string())?;
    f(conn).map_err(|error| error.to_string())
}

/// Opens the database, applies migrations and inserts missing default settings. Safe to call
/// more than once.
#[tauri::command]
pub async fn db_init(
    app: AppHandle,
    db: State<'_, Db>,
    default_settings: HashMap<String, String>,
) -> Result<(), String> {
    let mut guard = db.0.lock().unwrap_or_else(|error| error.into_inner());
    if guard.is_none() {
        *guard = Some(open(&app)?);
    }
    let conn = guard.as_mut().expect("connection was just opened");
    migrations::apply(conn).map_err(|error| error.to_string())?;
    settings::insert_defaults(conn, &default_settings).map_err(|error| error.to_string())
}

#[cfg(test)]
pub(crate) fn test_connection() -> Connection {
    let mut conn = Connection::open_in_memory().expect("in-memory database");
    configure(&conn).expect("configure");
    migrations::apply(&mut conn).expect("migrations");
    conn
}
