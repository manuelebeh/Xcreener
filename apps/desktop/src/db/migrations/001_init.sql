-- Xcreener local schema (Technical Stack §6.1)

CREATE TABLE IF NOT EXISTS captures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL,
    filepath    TEXT NOT NULL,
    thumbnail   TEXT,
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    format      TEXT NOT NULL,
    file_size   INTEGER NOT NULL,
    preset_used TEXT,
    tags        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_presets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    aspect_ratio    TEXT,
    background      TEXT NOT NULL,
    padding         INTEGER NOT NULL DEFAULT 40,
    border_radius   INTEGER NOT NULL DEFAULT 12,
    shadow          TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captures_tags ON captures(tags);
