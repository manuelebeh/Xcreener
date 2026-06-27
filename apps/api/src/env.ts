import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(8787),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    AUTH0_DOMAIN: z.string().min(1),
    AUTH0_AUDIENCE: z.string().min(1),
    WEB_PUBLIC_URL: z.string().url(),
    S3_ENDPOINT: z.string().url(),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_REGION: z.string().default('auto'),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
