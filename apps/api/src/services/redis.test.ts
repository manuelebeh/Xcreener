import { beforeEach, describe, expect, it, vi } from 'vitest';

const multiExec = vi.fn();
const multiChain = {
  set: vi.fn(() => multiChain),
  incr: vi.fn(() => multiChain),
  ttl: vi.fn(() => multiChain),
  exec: multiExec,
};

const redisMock = {
  multi: vi.fn(() => multiChain),
  ping: vi.fn(),
  quit: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn(() => redisMock),
}));

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    multiExec.mockReset();
  });

  it('allows requests within limit and creates the key with its TTL', async () => {
    multiExec.mockResolvedValue([
      [null, 'OK'],
      [null, 1],
      [null, 60],
    ]);

    const { checkRateLimit } = await import('./redis');
    const result = await checkRateLimit('api:general', 'key-1', 120, 60);

    expect(result.allowed).toBe(true);
    expect(result.retryAfterSec).toBe(60);
    expect(multiChain.set).toHaveBeenCalledWith('rate:api:general:key-1', '0', 'EX', 60, 'NX');
  });

  it('denies requests over limit with retry-after', async () => {
    multiExec.mockResolvedValue([
      [null, null],
      [null, 121],
      [null, 42],
    ]);

    const { checkRateLimit } = await import('./redis');
    const result = await checkRateLimit('api:general', 'key-1', 120, 60);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBe(42);
  });

  it('fails open and flags the outage when Redis is unreachable', async () => {
    multiExec.mockRejectedValue(new Error('ECONNREFUSED'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { checkRateLimit } = await import('./redis');
    const result = await checkRateLimit('comment', 'user-1', 60, 60);

    expect(result).toEqual({ allowed: true, retryAfterSec: 60, unavailable: true });
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
