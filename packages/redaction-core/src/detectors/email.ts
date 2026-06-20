import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function detectEmail(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(EMAIL_RE)) {
    if (matched.index === undefined) {
      continue;
    }
    regions.push(
      regionForMatch(line, matched.index, matched.index + matched[0].length, 'email', 4)
    );
  }

  return regions;
}
