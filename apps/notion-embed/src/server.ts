import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapGlowClient } from '@snapglow/sdk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, '../public');
const PORT = Number(process.env.NOTION_EMBED_PORT ?? 3456);
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID ?? '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? '';
const REDIRECT_URI =
  process.env.NOTION_EMBED_REDIRECT_URI ?? `http://localhost:${PORT}/oauth/callback`;

const sessions = new Map<string, { notionToken: string; workspaceName?: string }>();

function jsonResponse(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function exchangeNotionCode(code: string) {
  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
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
  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
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
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion API error (${response.status}): ${body}`);
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/oauth/start') {
    if (!NOTION_CLIENT_ID) {
      return jsonResponse(res, 500, { error: 'NOTION_CLIENT_ID not configured' });
    }
    const state = crypto.randomUUID();
    sessions.set(state, { notionToken: '' });
    const authorizeUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', NOTION_CLIENT_ID);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('owner', 'user');
    authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authorizeUrl.searchParams.set('state', state);
    res.writeHead(302, { Location: authorizeUrl.toString() });
    res.end();
    return;
  }

  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      res.writeHead(400);
      res.end('Missing code or state');
      return;
    }
    // Only states issued by /oauth/start are valid; otherwise a caller could pick the session id.
    const pending = sessions.get(state);
    if (!pending || pending.notionToken) {
      res.writeHead(400);
      res.end('Unknown or already used state');
      return;
    }

    try {
      const tokenPayload = await exchangeNotionCode(code);
      sessions.set(state, {
        notionToken: tokenPayload.access_token,
        workspaceName: tokenPayload.workspace_name,
      });
      res.writeHead(302, { Location: `/?session=${state}` });
      res.end();
    } catch (error) {
      res.writeHead(500);
      res.end(error instanceof Error ? error.message : String(error));
    }
    return;
  }

  if (url.pathname === '/api/pages' && req.method === 'GET') {
    const sessionId = url.searchParams.get('session');
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session?.notionToken) {
      return jsonResponse(res, 401, { error: 'Not connected to Notion' });
    }
    try {
      const pages = await searchNotionPages(session.notionToken);
      return jsonResponse(res, 200, { pages });
    } catch (error) {
      return jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (url.pathname === '/api/embed' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const payload = JSON.parse(body) as {
      session: string;
      pageId: string;
      apiKey: string;
      baseUrl: string;
      captureId: string;
      title?: string;
    };

    const session = sessions.get(payload.session);
    if (!session?.notionToken) {
      return jsonResponse(res, 401, { error: 'Not connected to Notion' });
    }

    try {
      const client = new SnapGlowClient({
        apiKey: payload.apiKey,
        baseUrl: payload.baseUrl,
      });

      const published = await client.captures.publish(payload.captureId);
      const title = payload.title ?? 'SnapGlow capture';

      await insertEmbedBlock(session.notionToken, payload.pageId, published.embedUrl, title);

      return jsonResponse(res, 200, {
        embedUrl: published.embedUrl,
        shareUrl: published.shareUrl,
      });
    } catch (error) {
      return jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (url.pathname === '/api/captures' && req.method === 'GET') {
    const apiKey = url.searchParams.get('apiKey');
    const baseUrl = url.searchParams.get('baseUrl') ?? 'http://localhost:8787';
    if (!apiKey) {
      return jsonResponse(res, 400, { error: 'Missing apiKey' });
    }
    try {
      const client = new SnapGlowClient({ apiKey, baseUrl });
      const list = await client.captures.list({ limit: 20 });
      return jsonResponse(res, 200, { items: list.items });
    } catch (error) {
      return jsonResponse(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

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
});

server.listen(PORT, () => {
  console.log(`SnapGlow Notion embed tool: http://localhost:${PORT}`);
});
