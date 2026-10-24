import { buildApp } from './app';
import { createDb, runMigrations } from './db/migrate';
import { env } from './env';
import { closeRedis, getRedis } from './services/redis';
import { closeRenderPool } from './services/render-pool';
import { purgeExpiredShares } from './services/share-cleanup';
import { StorageService } from './services/storage';

async function main() {
  await runMigrations();
  const { db, client } = createDb();
  await getRedis().connect();

  const storage = new StorageService();
  const app = await buildApp({ db, storage });

  const cleanup = setInterval(
    () => {
      purgeExpiredShares(db, storage).catch((error) =>
        console.error('Share cleanup failed', error)
      );
    },
    60 * 60 * 1000
  );
  cleanup.unref();

  const shutdown = async () => {
    clearInterval(cleanup);
    await app.close();
    await closeRenderPool();
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
