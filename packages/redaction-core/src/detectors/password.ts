import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const PASSWORD_CONTEXT_RE = /(?:password|passwd|secret|mot de passe)\s*[:=]\s*(\S{6,})/gi;

export function detectPassword(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(PASSWORD_CONTEXT_RE)) {
    const value = matched[1];
    if (!value || matched.index === undefined) {
      continue;
    }

    const valueStart = matched.index + matched[0].indexOf(value);
    regions.push(regionForMatch(line, valueStart, valueStart + value.length, 'password', 4));
  }

  return regions;
}
