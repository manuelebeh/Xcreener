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
    SLACK_CLIENT_ID: z.string().default(''),
    SLACK_CLIENT_SECRET: z.string().default(''),
    NOTION_CLIENT_ID: z.string().default(''),
    NOTION_CLIENT_SECRET: z.string().default(''),
    LINEAR_CLIENT_ID: z.string().default(''),
    LINEAR_CLIENT_SECRET: z.string().default(''),
    GITHUB_CLIENT_ID: z.string().default(''),
    GITHUB_CLIENT_SECRET: z.string().default(''),
    INTEGRATIONS_REDIRECT_URI: z.string().default('snapglow://integrations/callback'),
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    STRIPE_PRICE_TEAM_STARTER: z.string().default(''),
    STRIPE_PRICE_TEAM_PRO: z.string().default(''),
    AUTH0_MANAGEMENT_CLIENT_ID: z.string().default(''),
    AUTH0_MANAGEMENT_CLIENT_SECRET: z.string().default(''),
    RESEND_API_KEY: z.string().default(''),
    EMAIL_FROM: z.string().default('SnapGlow <notifications@snapglow.app>'),
    SMTP_URL: z.string().default(''),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
