import { describe, expect, it } from 'vitest';
import { parseTagsFromRow } from './captures.test-utils';

describe('captures search helpers', () => {
  it('parses JSON tag arrays', () => {
    expect(parseTagsFromRow('["bug","ui"]')).toEqual(['bug', 'ui']);
    expect(parseTagsFromRow(null)).toEqual([]);
    expect(parseTagsFromRow('')).toEqual([]);
  });
});
