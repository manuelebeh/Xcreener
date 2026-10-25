//! Schema migrations, run in order and recorded in `_schema_migrations`.

use rusqlite::{Connection, OptionalExtension};

const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../../../src/db/migrations/001_init.sql")),
    (2, include_str!("../../../src/db/migrations/002_library_ocr.sql")),
    (3, include_str!("../../../src/db/migrations/003_capture_uid.sql")),
    (4, include_str!("../../../src/db/migrations/004_capture_shortcut_default.sql")),
];

/// Splits a migration file into statements. A trigger body holds its own semicolons, so a
/// CREATE TRIGGER stays one statement until its END.
fn split_statements(sql: &str) -> Vec<String> {
    let without_comments = sql
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");

    let mut statements = Vec::new();
    let mut pending = String::new();
    for part in without_comments.split(';') {
        if pending.is_empty() {
            pending.push_str(part);
        } else {
            pending.push(';');
            pending.push_str(part);
        }
        let head = pending.trim_start().to_ascii_uppercase();
        let is_trigger = head.starts_with("CREATE TRIGGER")
            || head.starts_with("CREATE TEMP TRIGGER")
            || head.starts_with("CREATE TEMPORARY TRIGGER");
        if is_trigger && !pending.trim_end().to_ascii_uppercase().ends_with("END") {
            continue;
        }
        let statement = pending.trim();
        if !statement.is_empty() {
            statements.push(statement.to_string());
        }
        pending.clear();
    }
    if !pending.trim().is_empty() {
        statements.push(pending.trim().to_string());
    }
    statements
}

/// `ALTER TABLE <t> ADD COLUMN <c> ...` is the one statement SQLite cannot make idempotent.
fn parse_add_column(statement: &str) -> Option<(&str, &str)> {
    let words: Vec<&str> = statement.split_whitespace().take(6).collect();
    match words.as_slice() {
        [alter, table_kw, table, add, column_kw, column]
            if alter.eq_ignore_ascii_case("ALTER")
                && table_kw.eq_ignore_ascii_case("TABLE")
                && add.eq_ignore_ascii_case("ADD")
                && column_kw.eq_ignore_ascii_case("COLUMN") =>
        {
            Some((table, column))
        }
        _ => None,
    }
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let mut statement = conn.prepare("SELECT name FROM pragma_table_info(?1)")?;
    let names = statement.query_map([table], |row| row.get::<_, String>(0))?;
    for name in names {
        if name? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn table_exists(conn: &Connection, table: &str) -> rusqlite::Result<bool> {
    conn.query_row(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [table],
        |_| Ok(()),
    )
    .optional()
    .map(|row| row.is_some())
}

fn applied_version(conn: &Connection) -> rusqlite::Result<i64> {
    let recorded: Option<i64> =
        conn.query_row("SELECT MAX(version) FROM _schema_migrations", [], |row| row.get(0))?;
    match recorded {
        Some(version) => Ok(version),
        // Databases created before version tracking already hold the 001 schema.
        None if table_exists(conn, "captures")? => Ok(1),
        None => Ok(0),
    }
}

pub fn apply(conn: &mut Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )?;

    let current = applied_version(conn)?;
    if current >= 1 {
        conn.execute(
            "INSERT OR IGNORE INTO _schema_migrations (version) VALUES (1)",
            [],
        )?;
    }

    for (version, sql) in MIGRATIONS {
        if *version <= current {
            continue;
        }
        let tx = conn.transaction()?;
        for statement in split_statements(sql) {
            // A run interrupted after ALTER but before the version row left the column behind.
            if let Some((table, column)) = parse_add_column(&statement) {
                if column_exists(&tx, table, column)? {
                    continue;
                }
            }
            tx.execute_batch(&statement)?;
        }
        tx.execute(
            "INSERT INTO _schema_migrations (version) VALUES (?1)",
            [version],
        )?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn latest_version(conn: &Connection) -> i64 {
        conn.query_row("SELECT MAX(version) FROM _schema_migrations", [], |row| row.get(0))
            .unwrap()
    }

    #[test]
    fn keeps_trigger_bodies_in_one_statement() {
        let statements = split_statements(MIGRATIONS[1].1);
        let triggers: Vec<_> = statements
            .iter()
            .filter(|statement| statement.starts_with("CREATE TRIGGER"))
            .collect();
        assert_eq!(triggers.len(), 3);
        assert!(triggers.iter().all(|statement| statement.ends_with("END")));
    }

    #[test]
    fn parses_add_column() {
        assert_eq!(
            parse_add_column("ALTER TABLE captures ADD COLUMN ocr_text TEXT"),
            Some(("captures", "ocr_text"))
        );
        assert_eq!(parse_add_column("CREATE TABLE x (id INTEGER)"), None);
    }

    #[test]
    fn migrates_an_empty_database() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply(&mut conn).unwrap();
        assert_eq!(latest_version(&conn), 4);
        assert!(column_exists(&conn, "captures", "uid").unwrap());
        assert!(table_exists(&conn, "captures_fts").unwrap());

        apply(&mut conn).unwrap();
        assert_eq!(latest_version(&conn), 4);
    }

    #[test]
    fn upgrades_a_database_without_version_tracking() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(MIGRATIONS[0].1).unwrap();
        conn.execute(
            "INSERT INTO captures (filename, filepath, width, height, format, file_size)
             VALUES ('a.png', '/a.png', 1, 1, 'png', 1)",
            [],
        )
        .unwrap();

        apply(&mut conn).unwrap();

        assert_eq!(latest_version(&conn), 4);
        let uid: Option<String> = conn
            .query_row("SELECT uid FROM captures", [], |row| row.get(0))
            .unwrap();
        assert!(uid.is_some());
    }

    #[test]
    fn skips_a_column_left_by_an_interrupted_run() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply(&mut conn).unwrap();
        conn.execute("DELETE FROM _schema_migrations WHERE version >= 3", [])
            .unwrap();

        apply(&mut conn).unwrap();
        assert_eq!(latest_version(&conn), 4);
    }

    #[test]
    fn moves_only_the_old_default_capture_shortcut() {
        let mut conn = Connection::open_in_memory().unwrap();
        apply(&mut conn).unwrap();
        let shortcut = |conn: &Connection| -> String {
            conn.query_row(
                "SELECT value FROM settings WHERE key = 'captureShortcut'",
                [],
                |row| row.get(0),
            )
            .unwrap()
        };

        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('captureShortcut', 'CmdOrControl+Shift+KeyS')",
            [],
        )
        .unwrap();
        conn.execute("DELETE FROM _schema_migrations WHERE version = 4", [])
            .unwrap();
        apply(&mut conn).unwrap();
        assert_eq!(shortcut(&conn), "CmdOrControl+Shift+Digit2");

        conn.execute(
            "UPDATE settings SET value = 'Alt+KeyX' WHERE key = 'captureShortcut'",
            [],
        )
        .unwrap();
        conn.execute("DELETE FROM _schema_migrations WHERE version = 4", [])
            .unwrap();
        apply(&mut conn).unwrap();
        assert_eq!(shortcut(&conn), "Alt+KeyX");
    }
}
