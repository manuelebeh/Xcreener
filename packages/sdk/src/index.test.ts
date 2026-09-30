import { describe, expect, it, vi } from 'vitest';
import { ApiError, RateLimitError, SnapGlowClient } from './index';

describe('SnapGlowClient', () => {
  it('uploads a capture with multipart form data', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          id: 'cap-1',
          workspaceId: 'ws-1',
          title: null,
          mimeType: 'image/png',
          byteSize: 100,
          tags: [],
          documentState: {},
          screenshotUrl: 'https://example.com/s.png',
          exportUrl: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        { status: 201 }
      )
    );

    const client = new SnapGlowClient({
      apiKey: 'sg_live_testsecret',
      baseUrl: 'https://api.test',
      fetchImpl,
    });

    const blob = new Blob(['png'], { type: 'image/png' });
    const result = await client.captures.upload(blob, { title: 'Demo' });

    expect(result.id).toBe('cap-1');
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe('https://api.test/v1/public/captures');
    expect((call?.[1] as RequestInit | undefined)?.method).toBe('POST');
    expect((call?.[1]?.headers as Headers | undefined)?.get('Authorization')).toBe(
      'Bearer sg_live_testsecret'
    );
  });

  it('throws RateLimitError on 429', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Retry-After': '30' },
        })
    );

    const client = new SnapGlowClient({
      apiKey: 'sg_live_testsecret',
      fetchImpl,
    });

    await expect(client.captures.get('cap-1')).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws ApiError on other failures', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: 'Capture not found' }, { status: 404 })
    );

    const client = new SnapGlowClient({
      apiKey: 'sg_live_testsecret',
      fetchImpl,
    });

    await expect(client.captures.get('missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('publishes a capture as embed share', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          token: 'abc123',
          shareUrl: 'https://snapglow.app/s/abc123',
          embedUrl: 'https://snapglow.app/e/abc123',
          expiresAt: null,
        },
        { status: 201 }
      )
    );

    const client = new SnapGlowClient({
      apiKey: 'sg_live_testsecret',
      fetchImpl,
    });

    const result = await client.captures.publish('cap-1');
    expect(result.embedUrl).toContain('/e/');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/v1/public/captures/cap-1/publish'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
