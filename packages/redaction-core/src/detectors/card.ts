import type { SensitiveRegion, TextLine } from '../types';
import { regionForMatch } from './regionForMatch';

const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

function luhnValid(value: string): boolean {
  const digits = [...value].filter((ch) => ch >= '0' && ch <= '9').map(Number);

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let current = digits[index] ?? 0;
    if (double) {
      current *= 2;
      if (current > 9) {
        current -= 9;
      }
    }
    sum += current;
    double = !double;
  }

  return sum % 10 === 0;
}

export function detectCard(line: TextLine): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const matched of line.text.matchAll(CARD_RE)) {
    if (matched.index === undefined || !luhnValid(matched[0])) {
      continue;
    }
    regions.push(regionForMatch(line, matched.index, matched.index + matched[0].length, 'card', 6));
  }

  return regions;
}
