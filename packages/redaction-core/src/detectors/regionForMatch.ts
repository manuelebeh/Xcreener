import type { SensitiveRegion, TextLine } from '../types';

export function regionForMatch(
  line: TextLine,
  start: number,
  end: number,
  kind: SensitiveRegion['kind'],
  padding: number
): SensitiveRegion {
  const chars = [...line.text].length || 1;
  const startIndex = [...line.text.slice(0, start)].length;
  const matchLen = [...line.text.slice(start, end)].length;
  const charWidth = line.width / chars;
  const x = line.x + startIndex * charWidth;
  const width = matchLen * charWidth;

  return {
    x: Math.max(0, x - padding),
    y: Math.max(0, line.y - padding),
    width: width + padding * 2,
    height: line.height + padding * 2,
    kind,
  };
}
