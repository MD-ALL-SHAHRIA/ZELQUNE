# syntax=docker/dockerfile:1
# Dev image for every backend app (build context: repo root). docker-compose picks the app via APP.
# Slimmer per-service production images come with step 1.6.
FROM node:20-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

# Dependency layer depends only on the lockfile.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

FROM deps AS build
COPY . .
RUN SKIP_PRISMA_GENERATE=1 pnpm install --offline --frozen-lockfile --filter @zelqune/backend... \
 && cd backend && pnpm prisma:generate && pnpm build \
 && cd .. && SKIP_PRISMA_GENERATE=1 pnpm --filter @zelqune/backend deploy --prod /deploy

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /deploy/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/backend/package.json ./package.json
COPY --from=build --chown=node:node /repo/backend/dist ./dist
COPY --from=build --chown=node:node /repo/backend/apps ./apps
COPY --chown=node:node infra/docker/entrypoint.sh ./entrypoint.sh
USER node
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
