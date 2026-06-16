import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from './migrate';

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
