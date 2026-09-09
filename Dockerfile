# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS packages-build

RUN pnpm build:packages

FROM packages-build AS api-build

RUN pnpm --filter @nest-admin/api build
RUN pnpm --filter @nest-admin/api deploy --prod --legacy /out/api

FROM packages-build AS web-build

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}

RUN pnpm --filter @nest-admin/web build

FROM packages-build AS migrate

ENV NODE_ENV=production

CMD ["pnpm", "db:migrate"]

FROM node:22-bookworm-slim AS api

WORKDIR /app

ENV NODE_ENV=production

COPY --from=api-build /out/api/package.json ./package.json
COPY --from=api-build /out/api/node_modules ./node_modules
COPY --from=api-build /app/apps/api/dist ./dist
COPY --from=api-build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN mkdir -p /app/.uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]

FROM caddy:2-alpine AS web

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/apps/web/dist /srv

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
