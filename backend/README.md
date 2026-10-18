# @zelqune/backend

NestJS microservices (Nest monorepo mode): `apps/gateway` (the only public app) and 8 private
services, plus `libs/common` and `libs/contracts`. Architecture: [../docs/architecture.md](../docs/architecture.md).
Rules for contributors and Claude Code: [CLAUDE.md](CLAUDE.md).

## Commands (run from repo root unless noted)

| Command | What it does |
|---|---|
| `pnpm install` | installs everything and generates each service's Prisma client |
| `pnpm infra:up` / `pnpm infra:down` | full stack in Docker (`infra/docker-compose.yml`) |
| `pnpm health` | curls every `/health` on localhost |
| `pnpm --filter @zelqune/backend lint\|typecheck\|test\|build` | backend only |
| `pnpm --filter @zelqune/backend start:dev <app>` | run one app with watch (copy `apps/<app>/.env.example` to `.env`) |
| `pnpm gen:api` | export gateway OpenAPI and regenerate `packages/api-client` |

## Layout

```
apps/<service>/
  src/main.ts                 bootstrapService(): TCP transport + private HTTP /health
  src/app.module.ts           ServiceCoreModule.forRoot({ name, prisma })
  src/prisma/prisma.service.ts
  prisma/schema.prisma        own schema; OutboxEvent + ProcessedEvent for now
  prisma.config.ts, prisma/migrations/
libs/common/src/
  config/  logger/  errors/  health/  idempotency/  outbox/  messaging/  rpc/  service/  bootstrap/
libs/contracts/src/
  services.ts  events/ (defineEvent, envelope)  rpc/ (patterns, RpcRequest)
```

## Migrations

Service roles own only their schema and cannot create schemas or databases (ADR 0003), so
`prisma migrate dev` (which needs a shadow database) is not used. To add a migration:

```sh
cd backend
pnpm exec prisma migrate diff --config apps/<svc>/prisma.config.ts \
  --from-config-datasource --to-schema apps/<svc>/prisma/schema.prisma --script \
  > apps/<svc>/prisma/migrations/<timestamp>_<name>/migration.sql
```

Containers run `prisma migrate deploy` for their own schema on start.

## TODO (deferred to step 1.6)

- [ ] OpenTelemetry tracing (SDK + OTLP exporter, trace ids alongside `requestId`) — ADR 0005
- [ ] Sentry error reporting for the gateway (and storefront/dashboard)
- [ ] Per-service production images and production compose with only the gateway exposed
