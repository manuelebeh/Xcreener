import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createNotionEmbedServer } from './app';

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    });
  });
}

describe('notion embed server', () => {
  const apiHits: string[] = [];
  const fakeApi = createServer((req, res) => {
    apiHits.push(req.url ?? '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items: [], nextCursor: null }));
  });
  const otherHost = createServer((req, res) => {
    apiHits.push(`other:${req.url}`);
    res.end('{}');
  });
  let server: Server;
  let baseUrl: string;
  let otherUrl: string;

  beforeAll(async () => {
    const apiUrl = await listen(fakeApi);
    otherUrl = await listen(otherHost);
    server = createNotionEmbedServer({
      port: 0,
      notionClientId: '',
      notionClientSecret: '',
      redirectUri: 'http://localhost/oauth/callback',
      xcreenerApiUrl: apiUrl,
    });
    baseUrl = await listen(server);
  });

  afterAll(() => {
    server.close();
    fakeApi.close();
    otherHost.close();
  });

  it('answers 400 to a malformed body and keeps serving', async () => {
    const bad = await fetch(`${baseUrl}/api/embed`, { method: 'POST', body: 'not-json' });
    expect(bad.status).toBe(400);

    const next = await fetch(`${baseUrl}/api/captures`, { method: 'POST', body: '{' });
    expect(next.status).toBe(400);
  });

  it('only talks to the configured Xcreener API, whatever the request says', async () => {
    const response = await fetch(
      `${baseUrl}/api/captures?baseUrl=${encodeURIComponent(otherUrl)}`,
      {
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sg_live_test', baseUrl: otherUrl }),
      }
    );

    expect(response.status).toBe(200);
    expect(apiHits.some((hit) => hit.startsWith('other:'))).toBe(false);
    expect(apiHits.some((hit) => hit.startsWith('/v1/public/captures'))).toBe(true);
  });

  it('refuses embeds without a Notion session cookie', async () => {
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'k', pageId: 'p', captureId: 'c', session: 'guess' }),
    });
    expect(response.status).toBe(401);
  });
});
