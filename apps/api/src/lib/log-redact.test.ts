import { describe, expect, it } from 'vitest';
import { redactUrl } from './log-redact';

describe('redactUrl', () => {
  it('hides capability tokens in paths', () => {
    expect(redactUrl('/v1/shares/abc123')).toBe('/v1/shares/:token');
    expect(redactUrl('/v1/embeds/tok')).toBe('/v1/embeds/:token');
    expect(redactUrl('/v1/invitations/inv-token/accept')).toBe('/v1/invitations/:token/accept');
    expect(redactUrl('/v1/collab/documents/9f1c/comments')).toBe(
      '/v1/collab/documents/:token/comments'
    );
  });

  it('drops query strings and keeps other paths', () => {
    expect(redactUrl('/v1/library?q=password')).toBe('/v1/library');
    expect(redactUrl('/health')).toBe('/health');
  });
});
