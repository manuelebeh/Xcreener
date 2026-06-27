import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadOpenApiSpec(): Record<string, unknown> {
  const specPath = join(__dirname, '../../openapi/public.yaml');
  const raw = readFileSync(specPath, 'utf8');
  return parseYaml(raw) as Record<string, unknown>;
}

export async function registerOpenApiDocs(app: FastifyInstance) {
  const spec = loadOpenApiSpec();

  app.get('/openapi.json', async () => spec);

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      url: '/openapi.json',
    },
    staticCSP: true,
  });
}
