# 0010. Event evolution, audit trail, and what analytics may store

- Status: Accepted
- Date: 2026-10-19

## Context
Step 1.3 adds consumers that need more than the 1.2 events carried (contact details for SMS,
attribution for the funnel), an audit log of every admin change, and a GO counter that must
not be gamed or leak customer data.

## Decision
**Event evolution**
- Adding an **optional** field to a payload is non-breaking and keeps the version (v1).
  Removing, renaming, changing a type or making a field required is breaking: new version,
  old definition kept until every consumer has migrated.
- `order.placed` v1 gained optional `channel`, `customer {name, phone}`, `customerKey`,
  `sessionId`, `utm`. New events: `order.statusChanged` (every transition),
  `customer.friendFlagChanged`, `audit.recorded`, `quote.requested`.

**Customer data in analytics (owner rule)**
- `order.placed` may carry `customer {name, phone}` **for notification-service only**.
- **analytics-service must never store the raw phone** (or name). Its only customer
  identifier is `customerKey` = HMAC-SHA256(`CUSTOMER_KEY_SECRET`, E.164 phone), computed by
  order-service. A plain hash is not enough: ~10^9 Bangladeshi mobile numbers can be
  brute-forced in minutes; the HMAC cannot be reversed without the secret, which analytics
  does not have. Enforced by tests (no phone column, no phone value in analytics rows).

**Audit trail**
- The gateway puts the authenticated admin (`{id, role}` from the JWT) in the request context;
  `ServiceClient` forwards it in the RPC meta; services restore it.
- Every admin change writes `audit.recorded` with `recordAudit()` **in the same transaction**
  as the change (through the outbox): an entry exists if and only if the change committed.
  System actions (sweepers) are recorded as `SYSTEM`. `changes` never contains secrets.
- analytics-service stores entries idempotently (id = event id); `GET /v1/admin/audit-log` is
  OWNER only.

**GO counter**
- GO = orders with channel **B2C**, customer **not** `isFriend`, status in CONFIRMED,
  IN_PRODUCTION, READY_TO_SHIP, SHIPPED, DELIVERED, RETURN_REQUESTED, **and a VERIFIED advance
  payment > 0**. COD orders without an advance never count, even when confirmed. Cancelled,
  returned and refunded orders drop out. Target 10 (website-spec.md).
- `isFriend` is stored per phone in order-service (no customer accounts until M2) and reaches
  analytics as `customer.friendFlagChanged` keyed by `customerKey`.

**Projections** are upserts guarded by event timestamps, so parallel or retried consumers
converge regardless of arrival order.

## Consequences
- Rotating `CUSTOMER_KEY_SECRET` splits a customer's history in analytics (old vs new keys);
  rotate only with a re-keying migration.
- Funnel CHECKOUT/PURCHASE come from server events (trustworthy); VIEW/ADD_TO_CART come from an
  unauthenticated, rate-limited beacon and are indicative only.
