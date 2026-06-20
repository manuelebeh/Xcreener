import type { SensitiveRegion, TextLine } from '../types';
import { detectApiKey } from './apiKey';
import { detectCard } from './card';
import { detectEmail } from './email';
import { detectPassword } from './password';
import { detectPhone } from './phone';
import { detectUrl } from './url';

function overlaps(a: SensitiveRegion, b: SensitiveRegion): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

function expandToInclude(target: SensitiveRegion, other: SensitiveRegion): void {
  const x2 = Math.max(target.x + target.width, other.x + other.width);
  const y2 = Math.max(target.y + target.height, other.y + other.height);
  target.x = Math.min(target.x, other.x);
  target.y = Math.min(target.y, other.y);
  target.width = x2 - target.x;
  target.height = y2 - target.y;
}

function mergeOverlapping(regions: SensitiveRegion[]): SensitiveRegion[] {
  if (regions.length < 2) {
    return regions;
  }

  const sorted = [...regions].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    return a.x - b.x;
  });

  const merged: SensitiveRegion[] = [];

  for (const region of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.kind === region.kind && overlaps(last, region)) {
      expandToInclude(last, region);
      continue;
    }
    merged.push({ ...region });
  }

  return merged;
}

export function detectInLines(lines: TextLine[]): SensitiveRegion[] {
  const regions: SensitiveRegion[] = [];

  for (const line of lines) {
    regions.push(
      ...detectEmail(line),
      ...detectPhone(line),
      ...detectCard(line),
      ...detectApiKey(line),
      ...detectUrl(line),
      ...detectPassword(line)
    );
  }

  return mergeOverlapping(regions);
}
