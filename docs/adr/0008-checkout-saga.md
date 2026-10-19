# 0008. Checkout: orchestrated saga with synchronous steps, persisted log and TTL holds

- Status: Accepted
- Date: 2026-10-19

## Context
Checkout spans four services: catalog (prices), shipping (fee), inventory (stock) and payment.
The storefront needs an immediate answer ("order ZQ-…" or "out of stock" / "trxId already used").
Payments are manual (bKash/Nagad trxId verified by staff, or COD confirmed by phone), so an order
can wait hours for confirmation. A failure halfway must never leave stock reserved or a payment
recorded without an order.

## Decision
- **order-service orchestrates** the saga over TCP (extends ADR 0002: besides gateway -> service,
  the saga orchestrator may call its participants synchronously; participants never call back):
  1. reserve stock (IN_STOCK only) — compensation: release
  2. create payment — compensation: void (frees the trxId)
  3. in **one transaction**: order + item snapshots + status history, cart checked out,
     saga `COMPLETED`, `order.placed` in the outbox
- A **saga log** (`checkout_sagas`, id = order id) records each step. Business rejections (4xx)
  end the saga as `FAILED`; any other failure compensates (`COMPENSATING -> COMPENSATED`).
  Every step and compensation is idempotent per order id, so compensations are always safe to
  repeat. A **recovery poller** compensates sagas left unfinished for `SAGA_RECOVERY_AFTER_SECONDS`.
- **Stock**: reserved with a 15-minute TTL for the checkout window; `order.placed` moves it to
  **HELD** for `ORDER_HOLD_HOURS` (48); `order.confirmed` commits (SALE movement);
  `order.cancelled` or expiry releases. PRE_ORDER/MADE_TO_ORDER skip reservation.
- **Payment confirmation is event-driven**: staff verify the trxId (or confirm COD) in
  payment-service -> `payment.verified` -> order `CONFIRMED` -> `order.confirmed`.
- **Unpaid orders** (any sale mode) still `PENDING_PAYMENT` after `ORDER_HOLD_HOURS` are cancelled
  by order-service (`order.cancelled`): inventory releases, payment voids.
- **Advance**: fixed `ADVANCE_FIXED_PAISA` (৳300) per PRE_ORDER/MADE_TO_ORDER order, capped at
  the total (`ADVANCE_MODE=percent` optional). COD is not accepted for those orders.
- One sale mode per order; random order codes `ZQ-XXXXXX` (no sequential leak of volume).
- Gateway: cart-scoped `Idempotency-Key`, Turnstile and per-IP rate limits on checkout.

## Consequences
- The customer gets a definitive result in one request; the saga log explains every outcome.
- Orchestrator -> participant RPC couples availability: if inventory or payment is down,
  checkout fails fast (and compensates) rather than queuing.
- Manual verification within 48 hours is an operational requirement; the dashboard (step 1.5)
  must surface pending payments prominently.
- Admin HTTP routes for verify/confirm/ship/cancel arrive in step 1.3 (use-cases exist over TCP).
