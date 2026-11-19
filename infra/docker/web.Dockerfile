# Next.js app image (storefront or dashboard), standalone output. Build from the repo root:
#   docker build -f infra/docker/web.Dockerfile --build-arg APP=frontend --build-arg PORT=3100 ...
# NEXT_PUBLIC_* values are inlined at build time, so they are build args, not runtime env.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG APP
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG MEDIA_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY . .
RUN pnpm install --frozen-lockfile --filter "@zelqune/${APP}..." \
 && pnpm --filter "@zelqune/${APP}" build \
 && mkdir -p "${APP}/public"

FROM base AS runtime
ARG APP
ARG PORT
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=${PORT}
WORKDIR /app
COPY --from=build --chown=node:node /repo/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /repo/${APP}/.next/static ./${APP}/.next/static
COPY --from=build --chown=node:node /repo/${APP}/public ./${APP}/public
# Resized photos are cached here (a volume in production, so a redeploy keeps them).
RUN mkdir -p "${APP}/.next/cache/images" && chown -R node:node "${APP}/.next/cache"
USER node
ENV APP=${APP}
EXPOSE ${PORT}
CMD ["sh", "-c", "exec node \"$APP/server.js\""]
