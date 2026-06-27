import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => redisMock),
}));

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.incr.mockReset();
    redisMock.expire.mockReset();
    redisMock.ttl.mockReset();
  });

  it('allows requests within limit', async () => {
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);
    redisMock.ttl.mockResolvedValue(60);

    const { checkRateLimit } = await import('./redis');
    const result = await checkRateLimit('api:general', 'key-1', 120, 60);

    expect(result.allowed).toBe(true);
    expect(result.retryAfterSec).toBe(60);
    expect(redisMock.expire).toHaveBeenCalledWith('rate:api:general:key-1', 60);
  });

  it('denies requests over limit with retry-after', async () => {
    redisMock.incr.mockResolvedValue(121);
    redisMock.ttl.mockResolvedValue(42);

    const { checkRateLimit } = await import('./redis');
    const result = await checkRateLimit('api:general', 'key-1', 120, 60);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBe(42);
  });
});

describe('sendRateLimitReply contract', () => {
  it('sets Retry-After header and 429 status', async () => {
    const { sendRateLimitReply } = await import('../plugins/api-key-auth');
    const headers: Record<string, string> = {};
    const reply = {
      header: (name: string, value: string) => {
        headers[name] = value;
        return reply;
      },
      code: (status: number) => {
        expect(status).toBe(429);
        return reply;
      },
      send: (payload: unknown) => {
        expect(payload).toEqual({ error: 'Rate limit exceeded' });
        return reply;
      },
    };

    await sendRateLimitReply(reply as never, 30);
    expect(headers['Retry-After']).toBe('30');
  });
});
