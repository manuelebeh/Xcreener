import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { parse as parseYaml } from 'yaml';

function loadOpenApiSpec(): Record<string, unknown> {
  // Relative to the package root, like `./drizzle`, so it resolves from src/ and the dist bundle.
  const specPath = join(process.cwd(), 'openapi/public.yaml');
  const raw = readFileSync(specPath, 'utf8');
  return parseYaml(raw) as Record<string, unknown>;
}

export async function registerOpenApiDocs(app: FastifyInstance) {
  const spec = loadOpenApiSpec();

  app.get('/openapi.json', async () => spec);

  // swagger-ui requires @fastify/swagger; static mode serves the hand-written spec as-is.
  await app.register(swagger, {
    mode: 'static',
    specification: { document: spec as never },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}
