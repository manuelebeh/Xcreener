-- Sprint 2b.6: library OCR, tags, collections (local FTS5)

ALTER TABLE captures ADD COLUMN ocr_text TEXT;

CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
  ocr_text,
  content='captures',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS captures_fts_insert AFTER INSERT ON captures BEGIN
  INSERT INTO captures_fts(rowid, ocr_text) VALUES (new.id, coalesce(new.ocr_text, ''));
END;

CREATE TRIGGER IF NOT EXISTS captures_fts_update AFTER UPDATE OF ocr_text ON captures BEGIN
  INSERT INTO captures_fts(captures_fts, rowid, ocr_text) VALUES ('delete', old.id, old.ocr_text);
  INSERT INTO captures_fts(rowid, ocr_text) VALUES (new.id, coalesce(new.ocr_text, ''));
END;

CREATE TRIGGER IF NOT EXISTS captures_fts_delete AFTER DELETE ON captures BEGIN
  INSERT INTO captures_fts(captures_fts, rowid, ocr_text) VALUES ('delete', old.id, old.ocr_text);
END;

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS capture_collections (
  capture_id INTEGER NOT NULL REFERENCES captures(id) ON DELETE CASCADE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (capture_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_capture_collections_collection ON capture_collections(collection_id);
