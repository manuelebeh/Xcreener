import { can } from '@xcreener/team-core';
import { describe, expect, it } from 'vitest';

describe('collab permissions', () => {
  it('allows editors to edit collab', () => {
    expect(can('editor', 'collab:edit')).toBe(true);
    expect(can('editor', 'comments:create')).toBe(true);
  });

  it('restricts viewers to read-only collab', () => {
    expect(can('viewer', 'collab:read')).toBe(true);
    expect(can('viewer', 'collab:edit')).toBe(false);
    expect(can('viewer', 'comments:create')).toBe(true);
  });
});
