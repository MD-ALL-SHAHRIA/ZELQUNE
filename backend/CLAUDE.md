# Zelqune backend
NestJS microservices for a Bangladeshi home decor e-commerce. Architecture: ../docs/website-build-plan.md section 1, ../docs/architecture.md, ADRs in ../docs/adr/.

## Layout
Nest monorepo (or Nx). apps/: gateway, identity-service, catalog-service, inventory-service, order-service,
payment-service, shipping-service, notification-service, analytics-service. libs/: contracts, common.
Infra via ../infra/docker-compose.yml: Postgres (one schema per service), RabbitMQ, Redis.

## Rules
- TypeScript strict, no `any`. Only the gateway is public (REST /v1 + Swagger); services are private.
- Each service owns its schema; never read another service's tables. Share data only via RPC or events.
- Sync: gateway -> service via Nest microservice transport (TCP/gRPC); a saga orchestrator may also
  call its participants (ADR 0008). Async: RabbitMQ events named
  `<entity>.<pastTenseVerb>` with versioned payloads in libs/contracts.
- Outbox pattern for every published event; consumers are idempotent (store processed event ids).
- Checkout is a saga orchestrated by order-service with compensations (release stock, void payment).
- Money is integer paisa. Order/payment creation needs Idempotency-Key.
- Order, payment and shipment status change only through state machines (unit tested).
- External providers (payment, courier, SMS) behind interfaces with fake implementations for dev/tests.
- Every request carries x-request-id; pino logs, /health per service, OpenTelemetry traces.
- Secrets only in env; keep .env.example current.
- Tests: unit for services/state machines, e2e via gateway with Supertest, contract tests for events.
- Before finishing: lint, typecheck, test; fix failures; summarize changes.
