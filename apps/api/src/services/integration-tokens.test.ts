import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.INTEGRATION_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
});

import { openRefreshHandle, sealRefreshToken } from './integration-tokens';

describe('integration refresh handles', () => {
  it('opens only for the user and provider it was sealed for', () => {
    const handle = sealRefreshToken('provider-refresh', 'alice', 'jira');
    expect(handle).toMatch(/^v1\./);
    expect(handle).not.toContain('provider-refresh');

    expect(openRefreshHandle(handle as string, 'alice', 'jira')).toBe('provider-refresh');
    expect(openRefreshHandle(handle as string, 'mallory', 'jira')).toBeNull();
    expect(openRefreshHandle(handle as string, 'alice', 'confluence')).toBeNull();
  });

  it('rejects tampered or malformed handles', () => {
    const handle = sealRefreshToken('provider-refresh', 'alice', 'jira') as string;
    const bytes = Buffer.from(handle.slice('v1.'.length), 'base64url');
    bytes.writeUInt8(bytes.readUInt8(bytes.length - 1) ^ 1, bytes.length - 1);
    const tampered = `v1.${bytes.toString('base64url')}`;

    expect(openRefreshHandle(tampered, 'alice', 'jira')).toBeNull();
    expect(openRefreshHandle('v1.short', 'alice', 'jira')).toBeNull();
    expect(openRefreshHandle('v2.abc', 'alice', 'jira')).toBeNull();
    expect(openRefreshHandle('provider-refresh', 'alice', 'jira')).toBeNull();
  });

  it('never returns the same handle twice', () => {
    expect(sealRefreshToken('t', 'alice', 'jira')).not.toBe(sealRefreshToken('t', 'alice', 'jira'));
  });
});
