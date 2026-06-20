import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const API_KEY_RE = /\b(?:sk|pk|api|key|token|secret|password)[a-zA-Z0-9_-]{10,}\b/gi;

export function detectApiKey(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(API_KEY_RE)) {
    if (matched.index === undefined) {
      continue;
    }
    regions.push(
      regionForMatch(line, matched.index, matched.index + matched[0].length, 'api_key', 4)
    );
  }

  return regions;
}
