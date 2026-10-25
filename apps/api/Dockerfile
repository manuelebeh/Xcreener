# Production image for the Xcreener API. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t xcreener-api .
# Configuration comes from the environment (see apps/api/.env.example); migrations run at boot.

FROM node:24-slim AS build
RUN npm install -g pnpm@9.15.9
WORKDIR /repo
COPY . .
# Scripts are skipped: the root postinstall builds design tokens, which the API does not use.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @xcreener/api...
RUN pnpm --filter @xcreener/api build
RUN pnpm --filter @xcreener/api deploy --prod --ignore-scripts /out

# glibc (slim, not alpine) for the @napi-rs/canvas prebuilt binary.
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/drizzle ./drizzle
COPY --from=build --chown=node:node /repo/apps/api/openapi ./openapi
USER node
EXPOSE 8787
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
