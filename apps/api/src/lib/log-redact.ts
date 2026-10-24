import type { FastifyRequest } from 'fastify';

// Path segments that are capabilities: anyone holding the URL can read the resource.
const CAPABILITY_PATH = /\/(shares|embeds|invitations|collab\/documents)\/[^/?#]+/g;

/** Replaces share, embed, invitation and collab document ids in a URL with `:token`. */
export function redactUrl(url: string): string {
  const withoutQuery = url.split('?')[0] ?? url;
  return withoutQuery.replace(CAPABILITY_PATH, '/$1/:token');
}

/** Fastify `req` serializer: the default fields, with the URL redacted and the query dropped. */
export function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: redactUrl(request.url),
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  };
}
