# Architecture

Source of truth for scope and features: [website-build-plan.md](website-build-plan.md).
Decisions: [adr/](adr/README.md).

## System overview

```mermaid
flowchart LR
  subgraph Clients
    FE[frontend<br/>Next.js storefront]
    DB[dashboard<br/>Next.js admin]
  end

  FE -- REST /v1 --> GW
  DB -- REST /v1 --> GW

  subgraph Private network
    GW[gateway<br/>:3000 REST, Swagger /docs]
    GW -- TCP --> ID[identity :4001]
    GW -- TCP --> CA[catalog :4002]
    GW -- TCP --> IN[inventory :4003]
    GW -- TCP --> OR[order :4004]
    GW -- TCP --> PA[payment :4005]
    GW -- TCP --> SH[shipping :4006]
    GW -- TCP --> NO[notification :4007]
    GW -- TCP --> AN[analytics :4008]
    GW --- RD[(Redis<br/>idempotency, rate limit)]

    MQ{{RabbitMQ<br/>zelqune.events}}
    ID & CA & IN & OR & PA & SH -. outbox publish .-> MQ
    MQ -. consume .-> IN & OR & PA & SH & NO & AN

    PG[(Postgres<br/>one schema + role per service)]
    ID & CA & IN & OR & PA & SH & NO & AN --- PG
  end
```

## Ports (local dev)

| App | HTTP (/health) | TCP | Postgres schema / role |
|---|---|---|---|
| gateway | 3000 (public: /v1, /docs, /docs-json) | | none (Redis) |
| identity-service | 3001 | 4001 | `identity` / `identity_svc` |
| catalog-service | 3002 | 4002 | `catalog` / `catalog_svc` |
| inventory-service | 3003 | 4003 | `inventory` / `inventory_svc` |
| order-service | 3004 | 4004 | `orders` / `orders_svc` |
| payment-service | 3005 | 4005 | `payments` / `payments_svc` |
| shipping-service | 3006 | 4006 | `shipping` / `shipping_svc` |
| notification-service | 3007 | 4007 | `notifications` / `notifications_svc` |
| analytics-service | 3008 | 4008 | `analytics` / `analytics_svc` |
| Postgres / RabbitMQ / Redis | 5432 / 5672 + 15672 UI / 6379 | | |

All ports bind to `127.0.0.1` in dev. In production only the gateway is reachable, behind a
reverse proxy with HTTPS (step 1.6).

## Request path

1. Client calls `https://api.../v1/...`. The gateway accepts or generates `x-request-id`.
2. Gateway validates auth (from step 1.1) and calls the owning service with
   `{ meta: { requestId }, data }` over TCP.
3. The service writes its schema and, in the same transaction, any events to `outbox_events`.
4. `OutboxRelay` publishes to `zelqune.events` (routing key = event type).
5. Consumers dedupe on `processed_events` and apply the change in one transaction; failures are
   dead-lettered to `<service>.events.dlq`.

## Event envelope

```json
{
  "id": "uuid",
  "type": "order.placed",
  "version": 1,
  "occurredAt": "2026-10-19T00:00:00.000Z",
  "source": "order-service",
  "requestId": "…",
  "payload": {}
}
```

Contracts are declared with `defineEvent` in `backend/libs/contracts/src/events`.

## Checkout saga (step 1.2)

```mermaid
sequenceDiagram
  participant GW as gateway
  participant OR as order-service
  participant IN as inventory-service
  participant PA as payment-service
  GW->>OR: checkout (Idempotency-Key)
  OR->>IN: reserve stock (15 min TTL)
  IN-->>OR: stock.reserved
  OR->>PA: authorise / record COD or manual bKash
  alt payment ok
    PA-->>OR: payment.submitted / payment.verified
    OR-->>GW: order.placed → order.confirmed
  else failure
    OR->>IN: release stock (compensation)
    IN-->>OR: stock.released
  end
```
