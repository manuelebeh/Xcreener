import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapGlowClient } from '@snapglow/sdk';

const publicDir = join(fileURLToPath(new URL('.', import.meta.url)), '../public');

const SESSION_COOKIE = 'sg_notion_session';
const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 1000;
const MAX_BODY_BYTES = 1024 * 1024;

export interface NotionEmbedConfig {
  port: number;
  notionClientId: string;
  notionClientSecret: string;
  redirectUri: string;
  /** SnapGlow API every proxied call goes to. Never taken from the request (2026-10-24 audit, FINDING-005). */
  snapglowApiUrl: string;
}

export function configFromEnv(): NotionEmbedConfig {
  const port = Number(process.env.NOTION_EMBED_PORT ?? 3456);
  return {
    port,
    notionClientId: process.env.NOTION_CLIENT_ID ?? '',
    notionClientSecret: process.env.NOTION_CLIENT_SECRET ?? '',
    redirectUri: process.env.NOTION_EMBED_REDIRECT_URI ?? `http://localhost:${port}/oauth/callback`,
    snapglowApiUrl: process.env.SNAPGLOW_API_URL ?? 'http://localhost:8787',
  };
}

interface Session {
  notionToken: string;
  workspaceName?: string;
  expiresAt: number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function jsonResponse(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(chunk as Buffer);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Reported below as a 400.
  }
  throw new HttpError(400, 'Invalid JSON body');
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `Missing ${key}`);
  }
  return value.trim();
}

function readCookie(req: IncomingMessage, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function createNotionEmbedServer(config: NotionEmbedConfig = configFromEnv()): Server {
  const sessions = new Map<string, Session>();
  const secureCookie = config.redirectUri.startsWith('https://');

  function storeSession(id: string, session: Omit<Session, 'expiresAt'>) {
    sessions.delete(id);
    while (sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      sessions.delete(oldest);
    }
    sessions.set(id, { ...session, expiresAt: Date.now() + SESSION_TTL_MS });
  }

  function getSession(id: string | null): Session | null {
    if (!id) {
      return null;
    }
    const session = sessions.get(id);
    if (!session) {
      return null;
    }
    if (session.expiresAt < Date.now()) {
      sessions.delete(id);
      return null;
    }
    return session;
  }

  function connectedSession(req: IncomingMessage): Session {
    const session = getSession(readCookie(req, SESSION_COOKIE));
    if (!session?.notionToken) {
      throw new HttpError(401, 'Not connected to Notion');
    }
    return session;
  }

  function snapglowClient(apiKey: string) {
    return new SnapGlowClient({ apiKey, baseUrl: config.snapglowApiUrl });
  }

  async function exchangeNotionCode(code: string) {
    const credentials = Buffer.from(
      `${config.notionClientId}:${config.notionClientSecret}`
    ).toString('base64');
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion OAuth failed (${response.status})`);
    }

    return (await response.json()) as {
      access_token: string;
      workspace_name?: string;
    };
  }

  async function insertEmbedBlock(
    notionToken: string,
    pageId: string,
    embedUrl: string,
    title: string
  ) {
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: title } }],
              },
            },
            {
              object: 'block',
              type: 'embed',
              embed: { url: embedUrl },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error (${response.status}): ${await response.text()}`);
    }
  }

  async function searchNotionPages(notionToken: string) {
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        page_size: 20,
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion search failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      results: Array<{ id: string; object: string; url?: string }>;
    };

    return payload.results.map((page) => ({
      id: page.id,
      url: page.url ?? page.id,
    }));
  }

  async function serveStatic(url: URL, res: ServerResponse) {
    let filePath = join(publicDir, url.pathname === '/' ? 'index.html' : url.pathname);
    if (extname(filePath) === '') {
      filePath = join(publicDir, 'index.html');
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const types: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
      };
      res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', `http://localhost:${config.port}`);

    if (url.pathname === '/oauth/start') {
      if (!config.notionClientId) {
        return jsonResponse(res, 500, { error: 'NOTION_CLIENT_ID not configured' });
      }
      const state = crypto.randomUUID();
      storeSession(state, { notionToken: '' });
      const authorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', config.notionClientId);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('owner', 'user');
      authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
      authorizeUrl.searchParams.set('state', state);
      res.writeHead(302, { Location: authorizeUrl.toString() });
      res.end();
      return;
    }

    if (url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state) {
        throw new HttpError(400, 'Missing code or state');
      }
      // Only states issued by /oauth/start are valid; otherwise a caller could pick the session id.
      const pending = getSession(state);
      if (!pending || pending.notionToken) {
        throw new HttpError(400, 'Unknown or already used state');
      }

      const tokenPayload = await exchangeNotionCode(code);
      storeSession(state, {
        notionToken: tokenPayload.access_token,
        workspaceName: tokenPayload.workspace_name,
      });
      const cookie = [
        `${SESSION_COOKIE}=${encodeURIComponent(state)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${SESSION_TTL_MS / 1000}`,
        ...(secureCookie ? ['Secure'] : []),
      ].join('; ');
      res.writeHead(302, { Location: '/', 'Set-Cookie': cookie });
      res.end();
      return;
    }

    if (url.pathname === '/api/pages' && req.method === 'GET') {
      const session = connectedSession(req);
      return jsonResponse(res, 200, { pages: await searchNotionPages(session.notionToken) });
    }

    if (url.pathname === '/api/embed' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const session = connectedSession(req);
      const apiKey = requireString(body, 'apiKey');
      const pageId = requireString(body, 'pageId');
      const captureId = requireString(body, 'captureId');
      const title = typeof body.title === 'string' && body.title ? body.title : 'SnapGlow capture';

      const published = await snapglowClient(apiKey).captures.publish(captureId);
      await insertEmbedBlock(session.notionToken, pageId, published.embedUrl, title);

      return jsonResponse(res, 200, {
        embedUrl: published.embedUrl,
        shareUrl: published.shareUrl,
      });
    }

    // POST so the API key travels in the body, not in a logged query string.
    if (url.pathname === '/api/captures' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const list = await snapglowClient(requireString(body, 'apiKey')).captures.list({
        limit: 20,
      });
      return jsonResponse(res, 200, { items: list.items });
    }

    await serveStatic(url, res);
  }

  return createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpError) {
        jsonResponse(res, error.status, { error: error.message });
        return;
      }
      console.error('[notion-embed] request failed', error);
      jsonResponse(res, 500, { error: 'Request failed' });
    });
  });
}
