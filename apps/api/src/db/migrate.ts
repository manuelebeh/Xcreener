import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

export function createDb(connectionString = env.DATABASE_URL) {
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function runMigrations(connectionString = env.DATABASE_URL) {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
}

const isDirectRun = process.argv[1]?.endsWith('migrate.ts');
if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.log('Migrations applied');
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
