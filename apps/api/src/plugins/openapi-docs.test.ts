import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerOpenApiDocs } from './openapi-docs';

// buildApp skips the docs under NODE_ENV=test, so boot the plugin on its own.
describe('openapi docs', () => {
  it('registers and serves the spec and the UI', async () => {
    const app = Fastify();
    await registerOpenApiDocs(app);

    const spec = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(spec.statusCode).toBe(200);
    expect(spec.json()).toHaveProperty('openapi');

    const ui = await app.inject({ method: 'GET', url: '/docs/' });
    expect(ui.statusCode).toBe(200);
    await app.close();
  });
});
