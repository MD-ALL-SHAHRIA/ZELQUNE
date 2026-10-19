# Architecture Decision Records

Short records of significant decisions: context, decision, consequences. Never rewrite an
accepted ADR; supersede it with a new one.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-monorepo.md) | Single monorepo with pnpm workspaces and Turborepo | Accepted |
| [0002](0002-microservices-and-messaging.md) | Microservices: TCP for sync calls, RabbitMQ events with outbox | Accepted |
| [0003](0003-schema-per-service.md) | One Postgres schema and role per service | Accepted |
| [0004](0004-prisma-driver-adapter.md) | Prisma 7 with the pg driver adapter, one client per service | Accepted |
| [0005](0005-observability.md) | Observability: pino + x-request-id now, OpenTelemetry/Sentry in step 1.6 | Accepted |
| [0006](0006-auth-tokens-and-sessions.md) | Admin auth: ES256 access tokens, rotating refresh tokens, SameSite=Strict cookie | Accepted |
| [0007](0007-media-storage-provider.md) | Product media through a StorageProvider (R2 / local fake) | Accepted |
| [0008](0008-checkout-saga.md) | Checkout: orchestrated saga with synchronous steps, persisted log and TTL holds | Accepted |
| [0009](0009-event-retry-topology.md) | Event consumers retry through delay queues before the DLQ | Accepted |

Template: copy `0000-template.md`, take the next number, keep it under a page.
