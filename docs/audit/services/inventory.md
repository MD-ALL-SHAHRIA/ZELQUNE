# inventory-service audit

## Scope
Covered: `backend/apps/inventory-service/**` (src/stock/*, src/config, src/prisma, prisma/schema.prisma, both migrations, .env.example, test/), plus the callers and contracts it depends on: `libs/contracts/src/inventory/inventory.contracts.ts`, `libs/contracts/src/events/order.events.ts`, `apps/order-service/src/checkout/{checkout.service,participants}.ts`, `apps/order-service/src/orders/{order.service,order.handlers}.ts`, `apps/order-service/src/domain/order-state.ts`, `apps/gateway/src/admin/admin-catalog.controller.ts` (stock routes), `backend/test/integration/inventory.int-spec.ts`, ADR 0008, docs/architecture.md (event table).

Checked, OK:
- **No overselling.** reserve/release/commit/adjust all take `SELECT ... FOR UPDATE` on the `inventory_items` rows, in variant-id order (no deadlocks). The availability check runs after the lock, and `reserved: { increment }` runs inside the same tx. DB CHECKs (`on_hand >= 0`, `0 <= reserved <= on_hand`, `qty > 0`) back it up, so stock cannot go negative. An integration test covers concurrent checkouts for the last units.
- **Double commit / double release.** The reservation row is locked (`lockReservation` FOR UPDATE), then `canTransitionReservation` makes COMMITTED and RELEASED terminal. With the processed_events dedupe on top, duplicate events are no-ops. Tested (`commit` twice).
- **Out-of-order events.** cancelled before placed: release, then hold is a no-op. confirmed before placed: PENDING to COMMITTED, then hold is a no-op. A RELEASED reservation cannot be re-reserved (409).
- **Outbox.** `stock.reserved`, `stock.released` and the audit entry are all written with `outbox.add(tx, …)` in the business tx. Event handlers pass the dedupe tx through to `release/hold/commit`.
- **Validation.** Every TCP handler parses with zod (reserve: max 50 lines, qty <= 100; levels: max 100 ids; list: max 200 ids). Event payloads go through `orderPlaced/orderConfirmed/orderCancelled.parse`. `adjust` excludes `SALE` and rejects a delta of 0.
- **SQL.** Only tagged-template `$queryRaw` with `Prisma.join`/`Prisma.sql` is used. No `Unsafe`, no dynamic orderBy.
- **Sweeper.** `setInterval` is cleared in `onModuleDestroy`, skipped when `NODE_ENV=test`, and errors are caught in `sweepSafely`. The `(status, expires_at)` index matches the sweep query (`status IN … AND expires_at <= … ORDER BY expires_at LIMIT 100`). `order_id` has a unique index. Running several replicas is correct (see QUAL-1 for efficiency).
- **Gateway.** The stock routes are behind class-level `@Roles('OWNER','STAFF')`.
- **Tests.** Integration tests run on real Postgres: concurrency, idempotency, hold->commit, sweeper, adjust floor, outbox.

## Service map
- **Responsibility:** per-variant stock (`onHand`, `reserved`), checkout reservations (PENDING 15 min -> HELD 48 h -> COMMITTED | RELEASED), an append-only stock movement ledger, and admin adjustments.
- **Entry:** `src/main.ts` -> `bootstrapService(AppModule, 'inventory-service')`. HTTP 3003 (health), TCP 4003 (`.env.example`).
- **DB:** Postgres schema `inventory`, role `inventory_svc`. Tables: `inventory_items`, `stock_reservations`, `stock_reservation_items`, `stock_movements`, `outbox_events`, `processed_events`.
- **TCP patterns** (`RPC_PATTERNS.inventory`):
  - `reserve` and `release`: called by order-service participants.
  - `levels` (`inventory.stock.levels`): no caller, see DEAD-1.
  - `admin.list` and `admin.adjust`: called by gateway admin-catalog.
- **Calls out:** none.
- **Publishes (outbox):** `stock.reserved`, `stock.released` (reasons: COMPENSATION, EXPIRED, ORDER_CANCELLED), audit (`stock.adjust`).
- **Consumes:**
  - `order.placed` -> `inventory.holdOnOrderPlaced`
  - `order.confirmed` -> `inventory.commitOnOrderConfirmed`
  - `order.cancelled` -> `inventory.releaseOnOrderCancelled`
- **Timer:** reservation sweep every `RESERVATION_SWEEP_INTERVAL_MS` (30 s), batch of 100.

## Findings

### MSG-1: A confirmed order whose reservation has already expired never deducts stock (silent no-op, oversell)
- Severity: Medium / Confidence: Confirmed (code path); how often it happens needs a runtime check / Effort: M / Needs approval: no
- Location: `backend/apps/inventory-service/src/stock/inventory.service.ts:167-200`, `:203-214`
- Code:
```ts
  async hold(orderId: string, tx: Tx): Promise<void> {
    const reservation = await this.lockReservation(tx, orderId);
    if (!reservation || !canTransitionReservation(reservation.status, 'HELD')) return;
...
  async commit(orderId: string, tx: Tx): Promise<void> {
    const reservation = await this.lockReservation(tx, orderId);
    if (!reservation || !canTransitionReservation(reservation.status, 'COMMITTED')) return;
```
- Problem & impact: the sweeper releases PENDING reservations 15 min after reserve and HELD ones 48 h after `order.placed` is consumed. The order is only cancelled later, when order-service consumes `stock.released` with reason EXPIRED (`order.handlers.ts:25-36`, `cancelIfPending`). The two services are not coordinated, so a confirmation can land in that gap:
  - **PENDING expiry.** If `order.placed` is delayed more than 15 min (RabbitMQ down, order-service outbox relay stalled, or inventory's consumer in its 5s/30s/120s retry delays), the sweeper releases a reservation that belongs to a real, placed order. `hold()` then silently no-ops.
  - **HELD expiry.** inventory's sweep (expiry measured from when `order.placed` was consumed) races order-service's `cancelUnpaid` (cutoff measured from `createdAt`) and staff verifying the payment.
  - **Result.** If `payment.verified` is applied before order-service processes `stock.released` (EXPIRED), the order becomes CONFIRMED. `order.confirmed` -> `commit()` sees RELEASED and returns without error or log. The late `stock.released` -> `cancelIfPending` is also a no-op, because the order is no longer PENDING_PAYMENT.
  - **Impact.** A confirmed and paid order has no stock deducted, and the freed unit can be sold to another customer. For one-of-a-kind handcrafted items that is a real oversell, and nothing alerts anyone.
- Fix:
  - In `commit()`, when the reservation is RELEASED (EXPIRED): lock the rows, and if `onHand - reserved >= qty`, deduct `onHand` directly, write the SALE movement and mark the reservation COMMITTED. Otherwise `logger.error` plus an audit/outbox alert so staff see a shortage on a confirmed order.
  - In `hold()`, a reservation found RELEASED with reason EXPIRED can be re-reserved if stock is still available.
  - At minimum, log `warn` on every no-op where `stockReserved` was true.
  - Optionally have the PENDING expiry ignore orders whose `order.placed` arrived. That needs order-service to signal this, which is a contract change.

### MSG-2: Cancelling an order after it is confirmed never puts the stock back
- Severity: Medium / Confidence: Confirmed / Effort: M / Needs approval: yes (business rule: whether, and when, cancelled stock returns to the shelf; adds a nullable column)
- Location: `backend/apps/inventory-service/src/stock/inventory.service.ts:130-135`. Related: `backend/apps/order-service/src/domain/order-state.ts:4-7`
- Code:
```ts
      const reservation = await this.lockReservation(t, orderId);
      if (!reservation || !canTransitionReservation(reservation.status, 'RELEASED'))
        return { released: false };
```
```ts
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'READY_TO_SHIP', 'CANCELLED'],
  IN_PRODUCTION: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
```
- Problem & impact: an order can be cancelled from CONFIRMED or READY_TO_SHIP, after `order.confirmed` has already committed (deducted `onHand`). `order.cancelled` -> `release()` sees COMMITTED (a terminal state) and returns `{released:false}`. The unit stays deducted, so the product shows as sold out and sales are lost until staff remember to post a manual RETURN adjustment. RETURNED orders are not restocked either. ADR 0008 says "`order.cancelled` or expiry releases", which suggests restocking was expected.
- Fix: in `releaseOnOrderCancelled`, when the reservation is COMMITTED and has not been restocked:
  1. Lock the rows.
  2. `onHand += qty`.
  3. Write a `RETURN` movement with `refId = orderId`.
  4. Set a new nullable `restocked_at` column so a repeat is idempotent.
  5. Add an outbox audit entry.

  The owner should decide whether this applies to all pre-ship cancellations, which is safe because the goods are still in the shop.

### MSG-3: A reserve that times out leaves an orphan reservation holding stock for 15 min
- Severity: Low / Confidence: Likely / Effort: S / Needs approval: no
- Location: `backend/apps/inventory-service/src/stock/inventory.service.ts:130-135` (release of an unknown order is a no-op). Related: `backend/apps/order-service/src/checkout/checkout.service.ts:197-208` and `:240-246`
- Code:
```ts
  /** Idempotent: unknown orders (e.g. pre-orders) and already-final reservations are no-ops. */
  async release(raw: ReleaseStockRequest, tx?: Tx): Promise<{ released: boolean }> {
    ...
      const reservation = await this.lockReservation(t, orderId);
      if (!reservation || !canTransitionReservation(reservation.status, 'RELEASED'))
        return { released: false };
```
- Problem & impact:
  1. The ServiceClient times out after 5 s. A reserve can take that long while it waits on `FOR UPDATE` for a popular variant, or under DB load.
  2. order-service treats the timeout as a non-business error and compensates. Its `releaseStock` reaches inventory while the reserve tx is still uncommitted, finds no row and returns `released:false`. The saga is marked COMPENSATED.
  3. The reserve tx then commits a PENDING reservation for an order that will never exist. The stock stays reserved, and shows as unavailable, until the 15-min sweep.
  4. The resulting `stock.released` (EXPIRED) is harmless: no order exists.
  5. The customer gets an error and, on retry, may see "out of stock" for their own phantom hold.
- Fix: when `release()` is called with reason COMPENSATION for an unknown order, insert a tombstone `stock_reservations` row (status RELEASED, no items, `expiresAt = now`). A late reserve then hits the existing `RESERVATION_RELEASED` branch (lines 79-86), or loses the unique `order_id` race, and rolls back.

### QUAL-1: The sweeper claims SKIP LOCKED but doesn't use it, and one failing row stops the whole batch
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/apps/inventory-service/src/stock/inventory.service.ts:202-214`
- Code:
```ts
  /** Releases expired PENDING/HELD reservations. Safe with several replicas (SKIP LOCKED). */
  async releaseExpired(now = new Date()): Promise<number> {
    const due = await this.prisma.$queryRaw<{ order_id: string }[]>`
      SELECT order_id FROM stock_reservations
      WHERE status IN ('PENDING', 'HELD') AND expires_at <= ${now}
      ORDER BY expires_at LIMIT ${SWEEP_BATCH}`;
    let released = 0;
    for (const { order_id } of due) {
      const result = await this.release({ orderId: order_id, reason: 'EXPIRED' });
```
- Problem & impact:
  - **Multi-replica.** It stays correct because `release()` re-locks the row and re-checks the status. But every replica selects the same 100 oldest rows and queues up on the same locks, so the work is duplicated and the comment is misleading.
  - **One failure stops the batch.** A `release()` that throws aborts the loop. Examples: a P2025 if an inventory row is missing, a CHECK violation after a manual data fix, or a tx timeout. The rest of the batch is skipped. Because of `ORDER BY expires_at`, the same failing row comes first on every sweep, so expiry stops entirely and the only symptom is a repeated "Reservation sweep failed" log.
- Fix: wrap each `release` in try/catch, log the orderId and continue. Either drop the SKIP LOCKED claim, or claim rows with `FOR UPDATE SKIP LOCKED` inside a short tx.

### DB-1: The admin stock list is silently capped at 500 rows, with no pagination
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no (adding optional page params to the TCP query is additive, but it touches the contract and gateway)
- Location: `backend/apps/inventory-service/src/stock/inventory.service.ts:217-222`
- Code:
```ts
    const rows = await this.prisma.inventoryItem.findMany({
      where: variantIds?.length ? { variantId: { in: variantIds } } : {},
      orderBy: { sku: 'asc' },
      take: 500,
    });
```
- Problem & impact: once there are more than 500 variants, `GET /admin/stock` without ids drops the rest, with no `total` or next page. Staff cannot see or find stock for SKUs that sort late. Not urgent at the current catalogue size.
- Fix: add `page`/`limit` (or a cursor on `sku`) plus `total` to `stockListQuerySchema` and the response.

### DEAD-1: The `inventory.stock.levels` RPC has no caller
- Severity: Low / Confidence: Confirmed (grep found no `P.levels`, `inventory.levels` or `'inventory.stock.levels'` outside the inventory-service controller and patterns.ts; the only `get('inventory')` callers are order-service participants (reserve, release) and gateway admin (list, adjust)) / Effort: S / Needs approval: yes (removes a TCP contract pattern)
- Location: `backend/apps/inventory-service/src/stock/inventory.rpc.controller.ts:32-35`, `inventory.service.ts:233-238`, `libs/contracts/src/rpc/patterns.ts:78`
- Code:
```ts
  @MessagePattern(P.levels)
  levels(@Payload() req: RpcRequest<unknown>): Promise<StockLevels> {
    return this.inventory.levels(stockLevelsRequestSchema.parse(req.data).variantIds);
  }
```
- Problem & impact: unused surface. It may be intended for storefront availability that was never wired up. If so, the storefront currently shows no live stock and customers only learn an item is out of stock at checkout (409). The owner should decide whether to wire it up or remove it.
- Fix: either wire it into catalog/storefront availability, or remove the pattern, the method and the schema.
