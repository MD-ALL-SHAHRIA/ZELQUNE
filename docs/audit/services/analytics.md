# analytics-service audit

## Scope
Covered: `backend/apps/analytics-service/` (main.ts, app.module.ts, analytics.rpc.controller.ts,
projections/*, stats/*, finance/expense.service.ts, prisma/schema.prisma, all 3 migrations,
.env.example, test/health.e2e-spec.ts), the beacon path in the gateway
(`apps/gateway/src/shop/public-b2b.controller.ts`, `throttling/throttling.module.ts`,
`config/gateway-env.ts`), the storefront sender (`frontend/src/features/analytics/listeners.ts`),
gateway consumers of analytics RPCs (`admin-insights.controller.ts`, `admin-business.controller.ts`,
`admin/profit-loss.ts`), contracts (`libs/contracts/src/analytics`, `audit`, `reports`, `events`),
`test/integration/analytics.int-spec.ts`, `test/integration/privacy.int-spec.ts`, ADRs 0010, 0016, 0019, 0020.

Checked, OK:
- Raw SQL in `stats.service.ts` is all `$queryRaw` tagged templates; the only interpolations are bound
  params (`start`, `end`, `BD_TZ`) and `Prisma.join` of constant status lists. No `$queryRawUnsafe`,
  no `Prisma.raw`, no group-by or order-by from input. The date range is zod `z.iso.date()` and capped at
  366 days (`stats-rules.ts:36-52`).
- Beacon input: gateway validates with `BeaconEventDto` (zod) and the service parses again
  (`projections.service.ts:35`). Every field is bounded (sessionId regex 16-64, uuid ids, p<=8, path<=300,
  utm fields <=100). Extra keys are stripped. The route has its own throttle (`beacon`, 120/min/IP by default).
- Privacy (ADR 0010): there is no phone or name column. `order.placed`'s `customer` is ignored; only
  `customerKey` (HMAC from order-service) is stored. The beacon carries no IP or user agent, and analytics never
  stores them, so there is nothing to hash. The storefront sends `location.pathname` only (no query string)
  as `path`. The integration test "never stores the raw phone" exists.
- Projections: order status uses upsert + `updateMany ... statusChangedAt <= changedAt` (concurrency-safe
  under READ COMMITTED). The payment-verified increment is protected by the processed_events row in the same
  tx, and payment-service emits it once per payment. The audit log is upserted by event id. Every handler
  parses its payload with the contract zod schema. No handler makes an external call inside the tx.
- Expenses: zod-parsed in the service, written with the audit record in one transaction (outbox), OWNER-only
  in the gateway, integer paisa throughout. The P&L is composed in the gateway with integer arithmetic.
- The audit-log query is paginated (`limit <= 100`) and indexed on `occurred_at`, `(entity_type, entity_id)`, `actor_id`.
- Indexes on order_facts (`placed_at`, `confirmed_at`, `customer_key`) and expenses (`date`) match the queries.
- Gateway roles: dashboard is OWNER/STAFF, audit-log is OWNER, expenses and P&L are OWNER.

## Service map
- Responsibility: read models for the funnel/revenue/GO dashboard, the audit-log store, the expense ledger (P&L input),
  and storefront beacon ingestion.
- Entry: `src/main.ts` -> `bootstrapService(AppModule, 'analytics-service')`. HTTP 3008 (health), TCP 4008
  (`.env.example`). DB schema `analytics` (role `analytics_svc`).
- TCP patterns (`RPC_PATTERNS.analytics`): `track` (`analytics.events.track`), `dashboard`, `auditLog`,
  `listExpenses`, `createExpense`, `updateExpense`, `removeExpense`.
- Calls no other service.
- Publishes (outbox): `audit.recorded` (via `recordAudit`) for expense create/update/delete.
- Consumes: `privacy.erased` -> `analytics.privacyErased`; `order.placed` -> `analytics.projectOrderPlaced`;
  `order.confirmed` -> `analytics.projectOrderConfirmed`; `order.statusChanged` -> `analytics.projectOrderStatus`;
  `order.cancelled` -> `analytics.projectOrderCancelled`; `payment.verified` -> `analytics.projectPaymentVerified`;
  `customer.friendFlagChanged` -> `analytics.projectFriendFlag`; `audit.recorded` -> `analytics.storeAuditEntry`.
- Tables: outbox_events, processed_events, tracked_events, order_facts, customer_flags, audit_logs, expenses.
- Public path: `POST /v1/events` (gateway, `@Public`, throttle `beacon`) -> TCP `analytics.events.track` ->
  `INSERT tracked_events` (one row per beacon).

## Findings

### DB-1: Dashboard funnel query cannot use any index on tracked_events (full scan of the beacon table)
- Severity: Medium / Confidence: Confirmed (from the plan's shape; verify with EXPLAIN) / Effort: S / Needs approval: no
- Location: `backend/apps/analytics-service/src/stats/stats.service.ts:39-43`, `prisma/schema.prisma:76-77`
- Code:
```ts
const [funnel] = await this.prisma.$queryRaw<{ views: bigint; add_to_cart: bigint }[]>`
  SELECT
    count(DISTINCT session_id) FILTER (WHERE type = 'VIEW') AS views,
    count(DISTINCT session_id) FILTER (WHERE type = 'ADD_TO_CART') AS add_to_cart
  FROM tracked_events WHERE occurred_at >= ${start} AND occurred_at < ${end}`;
```
```prisma
  @@index([type, occurredAt])
  @@index([sessionId])
```
- Problem & impact: the WHERE clause filters only on `occurred_at`, and the only time index has `type` as its
  leading column. Postgres 17 (infra/docker-compose.yml) has no skip scan, so this is a sequential scan of the
  whole `tracked_events` table on every dashboard load. Nothing ever deletes from that table (DB-2), and anyone
  can write to it, so the scan grows without limit. The scan is followed by `count(DISTINCT)` sorts. The
  dashboard also runs its 7 queries one after another (lines 39-93), all inside the 5 s ServiceClient timeout.
  As the table grows, `/v1/admin/dashboard` will slow down and then time out.
- Fix: add `AND type IN ('VIEW','ADD_TO_CART')` to the WHERE so the existing `(type, occurred_at)` index is
  used (or add an `(occurred_at)` index migration). Consider running the independent queries with `Promise.all`.

### DB-2: Unauthenticated beacon writes with no retention: tracked_events grows forever
- Severity: Medium / Confidence: Confirmed / Effort: M / Needs approval: yes (deleting analytics data and the retention period are an owner/lawyer decision, docs/compliance/audit-2026-10-31.md:161)
- Location: `backend/apps/gateway/src/shop/public-b2b.controller.ts:91-97`, `backend/apps/gateway/src/config/gateway-env.ts:83`, `backend/apps/analytics-service/src/projections/projections.service.ts:34-52`
- Code:
```ts
@Post('events')
@HttpCode(204)
@RouteThrottle('beacon')
async beacon(@Body() body: BeaconEventDto): Promise<void> {
  await this.services.get('analytics').send(RPC_PATTERNS.analytics.track, body);
}
```
```ts
BEACON_PER_MINUTE: z.coerce.number().int().positive().default(120),
```
```ts
await this.prisma.trackedEvent.create({ data: { type: e.type, sessionId: e.sessionId, ... } });
```
- Problem & impact: each beacon is one permanent row. The only limit is per IP (120/min, about 173k rows per IP
  per day). There is no global cap, no dedupe (the same session can send the same VIEW repeatedly), and no
  cleanup job anywhere in the repo (grep finds no `trackedEvent.delete*` and no retention code). A few rotating IPs,
  or plain organic traffic over time, grow the table without bound. That feeds DB-1. The privacy policy also promises an analytics retention period
  (`docs/copy-en.md:516`), but nothing enforces one. A side effect: the A/B `sessions` count
  (stats.service.ts:78-79) can be inflated with random session ids, which skews price-experiment conversion
  rates. ADR 0010 accepts this as "indicative", but there is no dedupe at all.
- Fix: (1) a daily sweeper that deletes VIEW/ADD_TO_CART rows older than the agreed retention, or rolls them up
  into a daily aggregate table first. (2) Optionally dedupe (session, type, product, BD day) with a unique index
  plus `ON CONFLICT DO NOTHING`. (3) Optionally add a global per-minute cap in the gateway.

### SEC-1: Erasure (ADR 0020) leaves the visit id linked to the erased order in tracked_events
- Severity: Medium / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/apps/analytics-service/src/projections/analytics.handlers.ts:34-41`, `projections.service.ts:75-91, 102-115`
- Code:
```ts
on(privacyErased.type, 'privacyErased', async (e, tx) => {
  const { customerKey } = privacyErased.parse(e).payload;
  await tx.orderFact.updateMany({
    where: { customerKey },
    data: { customerKey: null, sessionId: null },
  });
  await tx.customerFlag.deleteMany({ where: { customerKey } });
});
```
```ts
await tx.trackedEvent.upsert({
  where: { orderId_type: { orderId: p.orderId, type: 'CHECKOUT' } },
  create: { type: 'CHECKOUT', orderId: p.orderId, sessionId: p.sessionId, ...
```
- Problem & impact: ADR 0020 says analytics will "unlink the customer key and visit id". Only `order_facts` is
  cleared. The CHECKOUT and PURCHASE rows in `tracked_events` keep `order_id` and `session_id` together, and
  every VIEW/ADD_TO_CART beacon of that session stays joinable through the same `session_id`. After an erasure,
  an operator can still rebuild which products the person viewed for each order. The handler also ignores the
  `erasedOrderIds` in the payload (`privacy.events.ts:15`), so orders whose fact has no `customerKey` (an older
  order or a missing key) are not unlinked. The integration test checks only `order_facts`
  (`test/integration/privacy.int-spec.ts:345-352`).
- Fix: in the same tx, read the session ids of the facts for `customerKey` or `erasedOrderIds`, then
  `updateMany tracked_events SET session_id = NULL WHERE order_id IN (...) OR session_id IN (...)`, and
  run the `order_facts` update for `orderId IN erasedOrderIds` too. Extend the privacy integration test.

### DB-3: Expense list silently truncates at 2000 rows, and P&L net profit uses the truncated total
- Severity: Medium / Confidence: Confirmed / Effort: S / Needs approval: no (return shape unchanged)
- Location: `backend/apps/analytics-service/src/finance/expense.service.ts:33-50`, `backend/apps/gateway/src/admin/profit-loss.ts:31`
- Code:
```ts
const rows = await this.prisma.expense.findMany({
  where: { date: { gte: day(range.from), lte: day(range.to) }, ... },
  orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  take: 2000,
});
...
  totalPaisa: rows.reduce((sum, r) => sum + r.amountPaisa, 0),
```
```ts
const netProfit = grossProfit + now.shipping - input.expenses.totalPaisa;
```
- Problem & impact: `totalPaisa` and `byCategory` are computed from at most 2000 rows. Over a 366-day range
  (allowed), a business that logs about 6 expenses a day goes past 2000. P&L then understates expenses and
  overstates net profit, and nothing shows that the list was cut.
- Fix: compute `totalPaisa` and `byCategory` with `expense.groupBy({ by: ['category'], _sum: { amountPaisa } })`
  over the full range, and keep `take` only for `items` (optionally add a `truncated` flag later, which would be a contract change).

### MSG-1: Friend-flag projection does read-then-upsert; concurrent deliveries can let an older flag win
- Severity: Low / Confidence: Likely / Effort: S / Needs approval: no
- Location: `backend/apps/analytics-service/src/projections/projections.service.ts:163-173` (consumer prefetch 10: `libs/common/src/messaging/event-consumer.ts:28,66-68`)
- Code:
```ts
const current = await tx.customerFlag.findUnique({ where: { customerKey: p.customerKey } });
if (current && current.changedAt > changedAt) return;
await tx.customerFlag.upsert({
  where: { customerKey: p.customerKey },
  create: { customerKey: p.customerKey, isFriend: p.isFriend, changedAt },
  update: { isFriend: p.isFriend, changedAt },
});
```
- Problem & impact: messages are handled concurrently (prefetch 10, `void this.onMessage`). Two flag changes for
  the same customer can both read "no row" or the old row, and the older event can commit last and overwrite
  the newer one. The upsert's update is not guarded by timestamp, unlike `onOrderStatusChanged`. The result
  is a wrong `is_friend`, so the GO counter counts or excludes the wrong order. ADR 0010 says projections are
  "guarded by event timestamps".
- Fix: one guarded statement:
  `INSERT ... ON CONFLICT (customer_key) DO UPDATE SET is_friend = EXCLUDED.is_friend, changed_at = EXCLUDED.changed_at WHERE customer_flags.changed_at <= EXCLUDED.changed_at`.

### DEAD-1: CHECKOUT/PURCHASE rows in tracked_events are written but never read (and can be wrong when events arrive out of order)
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no (stop writing; dropping existing rows would need approval)
- Location: `backend/apps/analytics-service/src/projections/projections.service.ts:75-91, 102-115`
- Code:
```ts
await tx.trackedEvent.upsert({
  where: { orderId_type: { orderId: p.orderId, type: 'PURCHASE' } },
  create: {
    type: 'PURCHASE', orderId: p.orderId,
    sessionId: fact.sessionId, experimentKey: fact.experimentKey, channel: fact.channel, ...
  },
  update: {},
});
```
- Problem & impact: every stats query that reads `tracked_events` filters to `VIEW`/`ADD_TO_CART`
  (stats.service.ts:41-42, 78-79). Checkout and purchase come from `order_facts`. A grep finds no other reader.
  If `order.confirmed` arrives before `order.placed`, the PURCHASE row is created from a placeholder fact
  (channel B2C, session and experiment null) and `update: {}` never fixes it. These rows are also what keeps the
  erased visit link alive (SEC-1).
- Fix: stop writing CHECKOUT/PURCHASE into `tracked_events` (simplest; it also removes most of SEC-1). Or, if you
  want them for future use, refresh them from `onOrderPlaced` with a non-empty `update`.

### QUAL-1: Expense amount has no upper bound and overflows the INT column with a 500
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/libs/contracts/src/reports/reports.contracts.ts:150`, `backend/apps/analytics-service/prisma/schema.prisma:156`
- Code:
```ts
amountPaisa: z.number().int().positive(),
```
```prisma
amountPaisa Int             @map("amount_paisa")
```
- Problem & impact: an OWNER typo above 2,147,483,647 paisa (about ৳2.1 crore) passes validation and then fails in
  Postgres (int4 out of range). The owner sees a generic 500 instead of a 400. The sum in the JS list is still safe.
- Fix: `.max(2_147_483_647)`, or a sensible business cap such as `.max(100_000_000_00)`.

### PERF-1: Dashboard runs 7 independent queries sequentially, with no shared snapshot
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/apps/analytics-service/src/stats/stats.service.ts:39-93`
- Code:
```ts
const [funnel] = await this.prisma.$queryRaw`...`;
const [orders] = await this.prisma.$queryRaw`...`;
const revenueByDay = await this.prisma.$queryRaw`...`;
const [todayRow] = await this.prisma.$queryRaw`...`;
const [go] = await this.prisma.$queryRaw`...`;
const experiments = await this.prisma.$queryRaw`...`;
const channels = await this.prisma.$queryRaw`...`;
```
- Problem & impact: total latency is the sum of 7 round trips and scans, inside a 5 s RPC timeout. This gets
  worse with DB-1. The numbers can also disagree slightly when events land between queries.
- Fix: `Promise.all` (no tx needed), or a `REPEATABLE READ` `$transaction([...])` if the numbers must agree with each other.
