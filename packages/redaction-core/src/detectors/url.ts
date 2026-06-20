import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const SENSITIVE_URL_RE = /https?:\/\/[^\s]*(?:token|key|secret|password|auth)[^\s]*/g;

export function detectUrl(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(SENSITIVE_URL_RE)) {
    if (matched.index === undefined) {
      continue;
    }
    regions.push(regionForMatch(line, matched.index, matched.index + matched[0].length, 'url', 4));
  }

  return regions;
}
