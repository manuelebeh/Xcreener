import { describe, expect, it } from 'vitest';
import { parseAddColumn, splitSqlStatements } from './migrate';

describe('splitSqlStatements', () => {
  it('splits multiple CREATE statements from migration SQL', () => {
    const sql = `
-- header comment
CREATE TABLE IF NOT EXISTS captures (id INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY);
CREATE INDEX IF NOT EXISTS idx ON captures(id);
`;

    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS captures');
    expect(statements[1]).toContain('CREATE TABLE IF NOT EXISTS settings');
    expect(statements[2]).toContain('CREATE INDEX IF NOT EXISTS idx');
  });
});

describe('splitSqlStatements with triggers', () => {
  it('keeps a trigger body in one statement', () => {
    const sql = `
CREATE TABLE IF NOT EXISTS a (id INTEGER);
CREATE TRIGGER IF NOT EXISTS a_update AFTER UPDATE ON a BEGIN
  INSERT INTO log(id) VALUES (old.id);
  INSERT INTO log(id) VALUES (new.id);
END;
CREATE TRIGGER IF NOT EXISTS a_delete AFTER DELETE ON a BEGIN
  INSERT INTO log(id) VALUES (old.id);
END;
CREATE INDEX IF NOT EXISTS idx ON a(id);
`;

    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(4);
    expect(statements[1]).toMatch(/^CREATE TRIGGER IF NOT EXISTS a_update[\s\S]*new\.id\);\s*END$/);
    expect(statements[2]).toMatch(/^CREATE TRIGGER IF NOT EXISTS a_delete[\s\S]*END$/);
    expect(statements[3]).toContain('CREATE INDEX');
  });

  it('splits the real library migration into whole statements', async () => {
    const { default: migration } = await import('./migrations/002_library_ocr.sql?raw');
    const statements = splitSqlStatements(migration);
    const triggers = statements.filter((statement) => statement.startsWith('CREATE TRIGGER'));
    expect(triggers).toHaveLength(3);
    for (const trigger of triggers) {
      expect(trigger.trim().endsWith('END')).toBe(true);
    }
  });
});

describe('parseAddColumn', () => {
  it('reads the table and column of an ADD COLUMN statement', () => {
    expect(parseAddColumn('ALTER TABLE captures ADD COLUMN ocr_text TEXT')).toEqual({
      table: 'captures',
      column: 'ocr_text',
    });
    expect(parseAddColumn('alter table captures\n  add column tags TEXT')).toEqual({
      table: 'captures',
      column: 'tags',
    });
  });

  it('ignores other statements', () => {
    expect(parseAddColumn('CREATE TABLE IF NOT EXISTS captures (id INTEGER)')).toBeNull();
    expect(parseAddColumn('ALTER TABLE captures RENAME TO old_captures')).toBeNull();
  });
});
