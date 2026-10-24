import { describe, expect, it, vi } from 'vitest';

const claims = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async () => ({ payload: claims.value }),
}));

import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateRequest } from './auth';

async function authenticate(payload: Record<string, unknown>) {
  claims.value = { sub: 'auth0|user', ...payload };
  const request = { headers: { authorization: 'Bearer token' } } as FastifyRequest;
  await authenticateRequest(request, {} as FastifyReply);
  return request.authUser;
}

describe('authenticateRequest email claim', () => {
  it('keeps an email Auth0 marks as verified', async () => {
    expect((await authenticate({ email: 'a@x.dev', email_verified: true }))?.email).toBe('a@x.dev');
  });

  it('drops an unverified email', async () => {
    expect((await authenticate({ email: 'a@x.dev', email_verified: false }))?.email).toBeNull();
  });

  it('drops an email when the verified claim is missing', async () => {
    expect((await authenticate({ email: 'a@x.dev' }))?.email).toBeNull();
  });
});
