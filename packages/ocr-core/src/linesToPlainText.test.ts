import { describe, expect, it } from 'vitest';
import { lineId, linesToPlainText, mergeSelectedLines } from './linesToPlainText';
import type { TextLine } from './types';

const sampleLines: TextLine[] = [
  { text: 'Hello', x: 0, y: 0, width: 40, height: 12, },
  { text: 'World', x: 0, y: 20, width: 40, height: 12 },
];

describe('linesToPlainText', () => {
  it('joins lines with newlines', () => {
    expect(linesToPlainText(sampleLines)).toBe('Hello\nWorld');
  });

  it('merges selected lines only', () => {
    const ids = [lineId(sampleLines[1]!)];
    expect(mergeSelectedLines(sampleLines, ids)).toBe('World');
  });
});
