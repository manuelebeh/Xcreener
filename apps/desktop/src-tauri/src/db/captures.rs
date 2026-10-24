use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use super::{with_conn, Db};

const COLUMNS: &str = "c.id, c.filename, c.filepath, c.thumbnail, c.width, c.height, c.format, \
                       c.file_size, c.preset_used, c.tags, c.ocr_text, c.created_at";

/// Same shape as `CaptureRow` in `src/db/captures.ts`.
#[derive(Debug, Serialize)]
pub struct CaptureRow {
    id: i64,
    filename: String,
    filepath: String,
    thumbnail: Option<String>,
    width: i64,
    height: i64,
    format: String,
    file_size: i64,
    preset_used: Option<String>,
    tags: Option<String>,
    ocr_text: Option<String>,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    snippet: Option<String>,
}

fn row_to_capture(row: &Row<'_>) -> rusqlite::Result<CaptureRow> {
    Ok(CaptureRow {
        id: row.get(0)?,
        filename: row.get(1)?,
        filepath: row.get(2)?,
        thumbnail: row.get(3)?,
        width: row.get(4)?,
        height: row.get(5)?,
        format: row.get(6)?,
        file_size: row.get(7)?,
        preset_used: row.get(8)?,
        tags: row.get(9)?,
        ocr_text: row.get(10)?,
        created_at: row.get(11)?,
        snippet: None,
    })
}

fn query_captures(
    conn: &Connection,
    sql: &str,
    params: impl rusqlite::Params,
) -> rusqlite::Result<Vec<CaptureRow>> {
    let mut statement = conn.prepare(sql)?;
    let rows = statement.query_map(params, row_to_capture)?;
    rows.collect()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertCaptureInput {
    filename: String,
    filepath: String,
    thumbnail: Option<String>,
    width: i64,
    height: i64,
    file_size: i64,
    format: String,
    /// JSON array of tag strings.
    tags: String,
    uid: String,
}

fn insert(conn: &Connection, input: &InsertCaptureInput) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO captures (filename, filepath, thumbnail, width, height, format, file_size, tags, uid)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            input.filename,
            input.filepath,
            input.thumbnail,
            input.width,
            input.height,
            input.format,
            input.file_size,
            input.tags,
            input.uid,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

fn get(conn: &Connection, id: i64) -> rusqlite::Result<Option<CaptureRow>> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM captures c WHERE c.id = ?1 LIMIT 1"),
        [id],
        row_to_capture,
    )
    .optional()
}

fn search(conn: &Connection, query: &str, limit: i64) -> rusqlite::Result<Vec<CaptureRow>> {
    let trimmed = query.trim();
    let fts_query = trimmed
        .split_whitespace()
        .map(|term| term.replace('"', "\"\""))
        .collect::<Vec<_>>()
        .join(" ");

    let fts = (|| {
        let mut statement = conn.prepare(&format!(
            "SELECT {COLUMNS}, snippet(captures_fts, 0, '…', '…', '…', 8) AS snippet
             FROM captures_fts
             JOIN captures c ON c.id = captures_fts.rowid
             WHERE captures_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2"
        ))?;
        let rows = statement.query_map(params![fts_query, limit], |row| {
            let mut capture = row_to_capture(row)?;
            capture.snippet = row.get(12)?;
            Ok(capture)
        })?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
    })();

    // FTS5 rejects some user input as syntax (unbalanced quotes, bare operators).
    fts.or_else(|_| {
        let like = format!("%{}%", trimmed.replace('%', "\\%"));
        query_captures(
            conn,
            &format!(
                "SELECT {COLUMNS} FROM captures c
                 WHERE c.ocr_text LIKE ?1 OR c.filename LIKE ?1
                 ORDER BY c.created_at DESC
                 LIMIT ?2"
            ),
            params![like, limit],
        )
    })
}

#[tauri::command]
pub async fn captures_insert(db: State<'_, Db>, input: InsertCaptureInput) -> Result<i64, String> {
    with_conn(&db, |conn| insert(conn, &input))
}

#[tauri::command]
pub async fn captures_update_ocr_text(
    db: State<'_, Db>,
    id: i64,
    ocr_text: String,
) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "UPDATE captures SET ocr_text = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![ocr_text, id],
        )
        .map(|_| ())
    })
}

/// `tags` is a JSON array of tag strings.
#[tauri::command]
pub async fn captures_update_tags(db: State<'_, Db>, id: i64, tags: String) -> Result<(), String> {
    with_conn(&db, |conn| {
        conn.execute(
            "UPDATE captures SET tags = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![tags, id],
        )
        .map(|_| ())
    })
}

#[tauri::command]
pub async fn captures_list(db: State<'_, Db>, limit: i64) -> Result<Vec<CaptureRow>, String> {
    with_conn(&db, |conn| {
        query_captures(
            conn,
            &format!("SELECT {COLUMNS} FROM captures c ORDER BY c.created_at DESC LIMIT ?1"),
            [limit],
        )
    })
}

#[tauri::command]
pub async fn captures_search(
    db: State<'_, Db>,
    query: String,
    limit: i64,
) -> Result<Vec<CaptureRow>, String> {
    with_conn(&db, |conn| search(conn, &query, limit))
}

#[tauri::command]
pub async fn captures_list_by_tag(
    db: State<'_, Db>,
    tag: String,
    limit: i64,
) -> Result<Vec<CaptureRow>, String> {
    let pattern = format!("%\"{}\"%", tag.replace('"', "\\\""));
    with_conn(&db, |conn| {
        query_captures(
            conn,
            &format!(
                "SELECT {COLUMNS} FROM captures c
                 WHERE c.tags LIKE ?1
                 ORDER BY c.created_at DESC
                 LIMIT ?2"
            ),
            params![pattern, limit],
        )
    })
}

#[tauri::command]
pub async fn captures_list_by_collection(
    db: State<'_, Db>,
    collection_id: i64,
    limit: i64,
) -> Result<Vec<CaptureRow>, String> {
    with_conn(&db, |conn| {
        query_captures(
            conn,
            &format!(
                "SELECT {COLUMNS} FROM captures c
                 JOIN capture_collections cc ON cc.capture_id = c.id
                 WHERE cc.collection_id = ?1
                 ORDER BY c.created_at DESC
                 LIMIT ?2"
            ),
            params![collection_id, limit],
        )
    })
}

#[tauri::command]
pub async fn captures_get(db: State<'_, Db>, id: i64) -> Result<Option<CaptureRow>, String> {
    with_conn(&db, |conn| get(conn, id))
}

#[tauri::command]
pub async fn captures_uid_exists(db: State<'_, Db>, uid: String) -> Result<bool, String> {
    with_conn(&db, |conn| {
        conn.query_row("SELECT 1 FROM captures WHERE uid = ?1 LIMIT 1", [uid], |_| {
            Ok(())
        })
        .optional()
        .map(|row| row.is_some())
    })
}

/// Deletes the row and returns it, so the caller can remove the files it points to.
#[tauri::command]
pub async fn captures_delete(db: State<'_, Db>, id: i64) -> Result<Option<CaptureRow>, String> {
    with_conn(&db, |conn| {
        let capture = get(conn, id)?;
        if capture.is_some() {
            conn.execute("DELETE FROM captures WHERE id = ?1", [id])?;
        }
        Ok(capture)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn insert_sample(conn: &Connection, filename: &str, ocr_text: Option<&str>) -> i64 {
        let id = insert(
            conn,
            &InsertCaptureInput {
                filename: filename.into(),
                filepath: format!("/captures/{filename}"),
                thumbnail: None,
                width: 10,
                height: 10,
                file_size: 100,
                format: "png".into(),
                tags: "[]".into(),
                uid: format!("uid-{filename}"),
            },
        )
        .unwrap();
        if let Some(text) = ocr_text {
            conn.execute(
                "UPDATE captures SET ocr_text = ?1 WHERE id = ?2",
                params![text, id],
            )
            .unwrap();
        }
        id
    }

    #[test]
    fn full_text_search_finds_ocr_text_with_a_snippet() {
        let conn = crate::db::test_connection();
        let id = insert_sample(&conn, "invoice.png", Some("quarterly invoice total"));
        insert_sample(&conn, "other.png", Some("unrelated text"));

        let found = search(&conn, "invoice", 30).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, id);
        assert!(found[0].snippet.as_deref().unwrap_or("").contains("invoice"));
    }

    #[test]
    fn invalid_fts_syntax_falls_back_to_like() {
        let conn = crate::db::test_connection();
        insert_sample(&conn, "brand.png", None);

        // A bare `AND` is an FTS5 syntax error; LIKE then matches the filename.
        let found = search(&conn, "AND", 30).unwrap();
        assert_eq!(found.len(), 1);
    }

    #[test]
    fn deleting_a_capture_removes_its_collection_links() {
        let conn = crate::db::test_connection();
        let id = insert_sample(&conn, "a.png", None);
        conn.execute("INSERT INTO collections (name) VALUES ('Work')", [])
            .unwrap();
        conn.execute(
            "INSERT INTO capture_collections (capture_id, collection_id) VALUES (?1, 1)",
            [id],
        )
        .unwrap();

        conn.execute("DELETE FROM captures WHERE id = ?1", [id]).unwrap();

        let links: i64 = conn
            .query_row("SELECT COUNT(*) FROM capture_collections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(links, 0);
    }
}
