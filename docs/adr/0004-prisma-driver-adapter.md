# 0004. Prisma 7 with the pg driver adapter, one generated client per service

- Status: Accepted
- Date: 2026-10-19

## Context
Each service needs its own typed data model and migrations. Prisma 7 (current stable) uses the
`prisma-client` generator, `prisma.config.ts` and driver adapters instead of a bundled engine.

## Decision
Each service has `prisma/schema.prisma`, `prisma.config.ts` and migrations, and generates its
client into `src/generated/prisma` (git-ignored, generated on install). Runtime uses
`@prisma/adapter-pg` with the service schema. Shared code in `libs/common` (outbox, consumer,
health) depends only on a minimal raw-SQL interface (`TransactionalDb`), never on a service's
generated client.

## Consequences
- Services cannot import each other's models by construction.
- NestJS 11, TypeScript 5.9 and Jest 29 are pinned deliberately; newer majors (Nest 12, TS 7,
  Prisma 8 RC) get evaluated in a dedicated upgrade PR.
