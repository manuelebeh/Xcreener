import { describe, expect, it } from 'vitest';
import { estimateCodeDimensions, getEditorLines } from './codeRenderer';

describe('estimateCodeDimensions', () => {
  it('scales with line count and length', () => {
    const dims = estimateCodeDimensions(['const x = 1;', 'console.log(x);']);
    expect(dims.width).toBeGreaterThan(300);
    expect(dims.height).toBeGreaterThan(40);
  });
});

describe('getEditorLines', () => {
  it('returns full document when no selection', () => {
    const lines = getEditorLines('a\nb\nc', 0, 0);
    expect(lines).toEqual(['a', 'b', 'c']);
  });

  it('returns selected slice when range provided', () => {
    const text = 'function test() {\n  return 1;\n}';
    const start = text.indexOf('return');
    const end = text.indexOf('\n}');
    const lines = getEditorLines(text, start, end);
    expect(lines.join('\n')).toBe('return 1;');
  });
});
