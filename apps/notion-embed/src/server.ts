import { configFromEnv, createNotionEmbedServer } from './app';

const config = configFromEnv();
// Loopback by default: this tool proxies API keys and Notion tokens and has no auth of its own.
const host = process.env.NOTION_EMBED_HOST ?? '127.0.0.1';

createNotionEmbedServer(config).listen(config.port, host, () => {
  console.log(`SnapGlow Notion embed tool: http://${host}:${config.port}`);
});
