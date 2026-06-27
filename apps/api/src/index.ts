import { buildApp } from './app';
import { createDb, runMigrations } from './db/migrate';
import { env } from './env';
import { closeRedis, getRedis } from './services/redis';

async function main() {
  await runMigrations();
  const { db, client } = createDb();
  await getRedis().connect();

  const app = await buildApp({ db });

  const shutdown = async () => {
    await app.close();
    await closeRedis();
    await client.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
