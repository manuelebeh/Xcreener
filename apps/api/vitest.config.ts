import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://snapglow:snapglow@localhost:5432/snapglow',
      REDIS_URL: 'redis://localhost:6379',
      AUTH0_DOMAIN: 'example.auth0.com',
      AUTH0_AUDIENCE: 'https://api.example.com',
      WEB_PUBLIC_URL: 'http://localhost:3000',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_BUCKET: 'snapglow-shares',
      S3_ACCESS_KEY: 'minioadmin',
      S3_SECRET_KEY: 'minioadmin',
      S3_REGION: 'auto',
      S3_FORCE_PATH_STYLE: 'true',
    },
  },
});
