import { describe, expect, it } from 'vitest';
import { generateCaptureFilename, generateThumbnailFilename, monthFolder } from './filenames';

describe('history filenames', () => {
  const date = new Date('2026-06-16T14:30:22');

  it('generates capture filename with timestamp', () => {
    expect(generateCaptureFilename(date)).toBe('capture_20260616_143022_000.png');
  });

  it('generates thumbnail filename with timestamp', () => {
    expect(generateThumbnailFilename(date)).toBe('thumb_20260616_143022_000.webp');
  });

  it('generates month folder', () => {
    expect(monthFolder(date)).toBe('2026-06');
  });
});
