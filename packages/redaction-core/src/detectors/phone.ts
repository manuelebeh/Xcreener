import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const PHONE_RE = /(?:(?:\+|00)[1-9]\d{0,2}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?(?:\d[\s().-]*){7,}\d/g;

function digitCount(value: string): number {
  return [...value].filter((ch) => ch >= '0' && ch <= '9').length;
}

export function detectPhone(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(PHONE_RE)) {
    if (matched.index === undefined || digitCount(matched[0]) < 8) {
      continue;
    }
    regions.push(
      regionForMatch(line, matched.index, matched.index + matched[0].length, 'phone', 4)
    );
  }

  return regions;
}
