# 0002. Microservices: TCP for sync calls, RabbitMQ events with transactional outbox

- Status: Accepted
- Date: 2026-10-19

## Context
The build plan (section 1) splits the backend into a public gateway and 8 private services.
Services need request/response calls from the gateway and reliable asynchronous events between
each other (e.g. `order.placed`, `stock.reserved`, `payment.verified`). Losing or double-applying
an event would corrupt stock or payments.

## Decision
- **Sync:** gateway -> service over the NestJS TCP transport. Every message is
  `{ meta: { requestId }, data }`; service errors return `{ status, code, message }` and the
  gateway maps them to HTTP. gRPC can replace TCP later without changing callers
  (`ServiceClient`).
- **Async:** RabbitMQ, one durable topic exchange `zelqune.events`, routing key = event type
  (`<entity>.<pastTenseVerb>`), versioned zod contracts in `libs/contracts`.
  One durable queue per consuming service (`<service>.events`) with a dead-letter queue.
- **Outbox:** events are inserted into the service's `outbox_events` table in the same DB
  transaction as the business change; `OutboxRelay` publishes with broker confirms
  (`FOR UPDATE SKIP LOCKED`, exponential backoff). Delivery is at-least-once.
- **Idempotent consumers:** `EventConsumer` records `(event_id, handler)` in `processed_events`
  inside the handler's transaction; duplicates are skipped; failures are dead-lettered.
- **HTTP idempotency:** order/payment creation requires an `Idempotency-Key` (Redis-backed).

## Consequences
- No lost events and no double effects, at the cost of an outbox table and a poller per service.
- Consumers must tolerate out-of-order delivery.
- Dead-lettered messages need an operator replay path (to build with the admin tooling).
