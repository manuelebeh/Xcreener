import type { TextLine } from './types';

export function linesToPlainText(lines: TextLine[]): string {
  return lines
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join('\n');
}

export function mergeSelectedLines(lines: TextLine[], selectedIds: string[]): string {
  const selected = new Set(selectedIds);
  return lines
    .filter((line) => selected.has(lineId(line)))
    .map((line) => line.text.trim())
    .filter(Boolean)
    .join('\n');
}

export function lineId(line: TextLine): string {
  return `${Math.round(line.x)}:${Math.round(line.y)}:${Math.round(line.width)}:${Math.round(line.height)}:${line.text}`;
}
