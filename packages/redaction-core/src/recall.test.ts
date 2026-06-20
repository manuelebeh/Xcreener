import { describe, expect, it } from 'vitest';

import { detectInLines } from './detectors';
import type { TextLine } from './types';

function line(text: string): TextLine {
  return {
    text,
    x: 0,
    y: 0,
    width: text.length * 10,
    height: 20,
  };
}

describe('detector recall', () => {
  it('meets >= 90% recall on corpus', () => {
    const corpus: Array<[string, string[]]> = [
      ['Contact user@example.com', ['email']],
      ['Phone 06 12 34 56 78', ['phone']],
      ['Card 4111 1111 1111 1111', ['card']],
      ['sk_live_abcdefghijklmnopqrstuvwxyz', ['api_key']],
      ['https://api.example.com?token=secret123', ['url']],
      ['password: hunter2', ['password']],
      ['Email alice@company.co.uk', ['email']],
      ['secret: my-long-secret-value', ['password']],
      ['Call 555-123-4567', ['phone']],
      ['No sensitive content here', []],
    ];

    let expected = 0;
    let found = 0;

    for (const [text, kinds] of corpus) {
      const regions = detectInLines([line(text)]);
      expected += kinds.length;
      for (const kind of kinds) {
        if (regions.some((region) => region.kind === kind)) {
          found += 1;
        }
      }
    }

    const recall = expected === 0 ? 1 : found / expected;
    expect(recall).toBeGreaterThanOrEqual(0.9);
  });
});
