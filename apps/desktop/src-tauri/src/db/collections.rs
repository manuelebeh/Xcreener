use rusqlite::{params, Connection, Row};
use serde::Serialize;
use tauri::State;

use super::{with_conn, Db};

/// Same shape as `CollectionRow` in `src/db/collections.ts`.
#[derive(Debug, Serialize)]
pub struct CollectionRow {
    id: i64,
    name: String,
    created_at: String,
}

fn row_to_collection(row: &Row<'_>) -> rusqlite::Result<CollectionRow> {
    Ok(CollectionRow {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
    })
}

fn create(conn: &Connection, name: &str) -> rusqlite::Result<CollectionRow> {
    conn.execute("INSERT INTO collections (name) VALUES (?1)", [name])?;
    conn.query_row(
        "SELECT id, name, created_at FROM collections WHERE name = ?1 LIMIT 1",
        [name],
        row_to_collection,
    )
}

#[tauri::command]
pub async fn collections_list(db: State<'_, Db>) -> Result<Vec<CollectionRow>, String> {
    with_conn(&db, |conn| {
        let mut statement =
            conn.prepare("SELECT id, name, created_at FROM collections ORDER BY name ASC")?;
        let rows = statement.query_map([], row_to_collection)?;
        rows.collect()
    })
}

#[tauri::command]
pub async fn collections_create(db: State<'_, Db>, name: String) -> Result<CollectionRow, String> {
    with_conn(&db, |conn| create(conn, name.trim()))
}

#[tauri::command]
pub async fn collections_rename(db: State<'_, Db>, id: i64, name: String) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "UPDATE collections SET name = ?1 WHERE id = ?2",
            params![name.trim(), id],
        )
        .map(|_| ())
    })
}

#[tauri::command]
pub async fn collections_delete(db: State<'_, Db>, id: i64) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute("DELETE FROM collections WHERE id = ?1", [id])
            .map(|_| ())
    })
}

#[tauri::command]
pub async fn collections_add_capture(
    db: State<'_, Db>,
    capture_id: i64,
    collection_id: i64,
) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "INSERT OR IGNORE INTO capture_collections (capture_id, collection_id) VALUES (?1, ?2)",
            [capture_id, collection_id],
        )
        .map(|_| ())
    })
}

#[tauri::command]
pub async fn collections_remove_capture(
    db: State<'_, Db>,
    capture_id: i64,
    collection_id: i64,
) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "DELETE FROM capture_collections WHERE capture_id = ?1 AND collection_id = ?2",
            [capture_id, collection_id],
        )
        .map(|_| ())
    })
}

#[tauri::command]
pub async fn collections_for_capture(
    db: State<'_, Db>,
    capture_id: i64,
) -> Result<Vec<i64>, String> {
    with_conn(&db, |conn| {
        let mut statement =
            conn.prepare("SELECT collection_id FROM capture_collections WHERE capture_id = ?1")?;
        let rows = statement.query_map([capture_id], |row| row.get(0))?;
        rows.collect()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deleting_a_collection_removes_its_capture_links() {
        let conn = crate::db::test_connection();
        conn.execute(
            "INSERT INTO captures (filename, filepath, width, height, format, file_size, uid)
             VALUES ('a.png', '/a.png', 1, 1, 'png', 1, 'u1')",
            [],
        )
        .unwrap();
        let collection = create(&conn, "Work").unwrap();
        conn.execute(
            "INSERT INTO capture_collections (capture_id, collection_id) VALUES (1, ?1)",
            [collection.id],
        )
        .unwrap();

        conn.execute("DELETE FROM collections WHERE id = ?1", [collection.id])
            .unwrap();

        let links: i64 = conn
            .query_row("SELECT COUNT(*) FROM capture_collections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(links, 0);
    }
}
