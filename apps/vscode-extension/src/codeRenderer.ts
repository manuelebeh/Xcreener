export interface CodeRenderOptions {
  lines: string[];
  language?: string;
  fontSize?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
  lineNumberColor?: string;
}

export interface CodeRenderResult {
  width: number;
  height: number;
  png: Buffer;
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 24;
const LINE_HEIGHT_RATIO = 1.5;
const CHAR_WIDTH_RATIO = 0.6;

export function estimateCodeDimensions(
  lines: string[],
  fontSize = DEFAULT_FONT_SIZE,
  padding = DEFAULT_PADDING
): { width: number; height: number } {
  const lineHeight = Math.ceil(fontSize * LINE_HEIGHT_RATIO);
  const maxChars = Math.max(...lines.map((line) => line.length), 1);
  const contentWidth = Math.ceil(maxChars * fontSize * CHAR_WIDTH_RATIO);
  const lineNumberGutter = String(lines.length).length * fontSize * CHAR_WIDTH_RATIO + 16;
  const width = Math.min(Math.max(contentWidth + lineNumberGutter + padding * 2, 320), 2400);
  const height = Math.min(lines.length * lineHeight + padding * 2, 4000);
  return { width, height };
}

/** Minimal PNG encoder for monospace code blocks (no native canvas in tests). */
export async function renderCodeToPng(options: CodeRenderOptions): Promise<CodeRenderResult> {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const padding = options.padding ?? DEFAULT_PADDING;
  const lines = options.lines.length > 0 ? options.lines : [''];
  const { width, height } = estimateCodeDimensions(lines, fontSize, padding);

  const { createCanvas } = await import('@napi-rs/canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = options.backgroundColor ?? '#1e1e2e';
  ctx.fillRect(0, 0, width, height);

  const lineHeight = Math.ceil(fontSize * LINE_HEIGHT_RATIO);
  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  const gutterWidth = String(lines.length).length * charWidth + 16;

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let index = 0; index < lines.length; index++) {
    const y = padding + index * lineHeight;

    ctx.fillStyle = options.lineNumberColor ?? '#6c7086';
    ctx.fillText(String(index + 1).padStart(String(lines.length).length, ' '), padding, y);

    ctx.fillStyle = options.textColor ?? '#cdd6f4';
    ctx.fillText(lines[index] ?? '', padding + gutterWidth, y);
  }

  const png = canvas.toBuffer('image/png');
  return { width, height, png };
}

export function getEditorLines(
  fullText: string,
  selectionStart: number,
  selectionEnd: number
): string[] {
  if (selectionStart === selectionEnd) {
    return fullText.split('\n');
  }
  const selected = fullText.slice(selectionStart, selectionEnd);
  return selected.split('\n');
}
