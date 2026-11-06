# payment-service audit

## Scope
Files read in full: `backend/apps/payment-service/src/**` (main.ts, app.module.ts, config/payment-env.ts, prisma/prisma.service.ts, payments/{payment.service,payment.rpc.controller,payment.handlers,payment.provider,payment-state,payment.spec}.ts, settings/payment-settings.ts), `prisma/schema.prisma`, all 3 migrations, `.env.example`, `test/health.e2e-spec.ts`.
Cross-checked callers/contracts: `libs/contracts/src/payments/payments.contracts.ts`, `libs/contracts/src/settings/settings.contracts.ts`, `libs/common/src/settings/settings.store.ts`, gateway `admin/admin-orders.controller.ts` (verify/reject/confirm-cod), `admin/admin-settings.controller.ts`, `shop/shop.controller.ts` (track), order-service `checkout/participants.ts`, `checkout/checkout.service.ts`, `domain/pricing.ts`, `orders/order.service.ts` (confirmFromPayment, cancelUnpaid), `domain/order-state.ts`, ADR 0008/0022.

Checked, OK:
- **trxId uniqueness is enforced in the DB**: `CREATE UNIQUE INDEX "payments_trx_id_key"` (migration 20261019024101 l.47). There is no app-level check-then-insert, so two orders racing with the same trxId cannot both win: the loser gets P2002, which maps to 409 TRX_ID_ALREADY_USED. trxId is normalised before storage (trim, strip spaces and dashes, uppercase, `^[A-Z0-9]{6,20}$`, trxIdSchema). P2002 detection uses `JSON.stringify(meta).includes('trx_id')`. With Prisma 7.10 plus adapter-pg, the meta carries the constraint fields or name, which contain `trx_id`. Needs a runtime check, but it is plausible.
- **One open payment per order**: a partial unique index exists in the DB (`payments_one_open_per_order`), and `CHECK (amount_paisa > 0)`.
- **Amount tampering**: the client cannot set the amount. order-service computes `amountPaisa` server-side (`domain/pricing.ts:93-95`, from totals / advanceRequired) and sends it over TCP. Verify requires `amountReceivedPaisa === payment.amountPaisa`.
- **Double-verify race**: verify, confirmCod and reject each take `SELECT ... FOR UPDATE` on the payment row, re-read it, then `canTransitionPayment`. A second concurrent verify sees VERIFIED and gets 409 INVALID_PAYMENT_TRANSITION, so payment.verified cannot be emitted twice. VERIFIED, REJECTED, COLLECTED and VOID are terminal (unit-tested).
- **Void idempotency**: `voidForOrder` locks the order's rows FOR UPDATE and returns `{voided:false}` when nothing is open. It is safe from both the saga-compensation RPC and the order.cancelled consumer. Verify and void are serialised by row locks.
- **Outbox in the same transaction**: payment.submitted, payment.verified and the audit events are all written with `outbox.add(tx, ...)` / `recordAudit(..., tx, ...)` inside the same `$transaction` as the state change. Consumers write through the consumer's `tx`. No external side effects run inside handlers.
- **Input validation**: every TCP handler parses with zod before use (create, void, summaryByOrder, verify, reject, confirmCod, and settings.update via `SettingsStore.update -> schema.parse`). Event handlers use `orderCancelled.parse` / `privacyErased.parse`.
- **Staff authorization and audit**: the gateway admin routes are under class-level `@Roles('OWNER','STAFF')`. `verifiedBy` / `rejectedBy` / `confirmedBy` come from `@CurrentUser().id`, not the body. Verify, reject, confirmCod and settings changes are each audited in the transaction (trxId last 4 only). Changing the bKash/Nagad receiving number (a high-value target) is `@Roles('OWNER')` only.
- **PII**: no logger calls in the service. API responses expose `trxIdLast4` only. Audit entries contain no phone. privacy.erased nulls `payer_phone`.
- **Raw SQL**: only tagged-template `$queryRaw` with params validated by `z.uuid()`. No `*Unsafe`.
- **Provider integration**: none yet. M1 has manual and COD only, so there is no outbound HTTP and there are no secrets. The env schema is validated at startup via `serviceEnvSchema.extend`.
- **Indexes**: `payments(order_id)`, `payments(trx_id)` unique, `payment_status_changes(payment_id)` cover all where clauses.

## Service map
- Responsibility: one payment per order (COD, or manual bKash/Nagad trxId verified by staff), plus the bKash/Nagad receiving-number settings (ADR 0017).
- Entry: `src/main.ts` -> `bootstrapService(AppModule,'payment-service')`. HTTP 3005 (health), TCP 4005. DB schema `payments`, role `payments_svc`.
- TCP patterns (`RPC_PATTERNS.payment.*`): `create`, `void`, `summaryByOrder`, `instructions`, `admin.verify`, `admin.reject`, `admin.confirmCod`, `settings.get`, `settings.update`.
- Callers: order-service saga (`participants.ts`: create / void / instructions), and gateway (admin verify / reject / confirm-cod / settings, shop track and admin detail -> summaryByOrder).
- Calls out: none.
- Publishes (outbox): `payment.submitted` (no consumer anywhere yet), `payment.verified` (order, notification and analytics consume it), and audit events.
- Consumes: `order.cancelled` -> `payment.voidOnOrderCancelled`, and `privacy.erased` -> `payment.privacyErased`.

## Findings

### ARCH-1: Auto-cancel after 48h voids a payment the customer already sent, and the voided payment disappears from the dashboard
- Severity: Medium / Confidence: Confirmed / Effort: M / Needs approval: yes (the minimal visible fix changes the PaymentSummary or admin response shape; the alternative changes order-service cancel rules)
- Location: `backend/apps/payment-service/src/payments/payment.handlers.ts:16-25`, `backend/apps/payment-service/src/payments/payment.service.ts:139-159`, `backend/apps/order-service/src/orders/order.service.ts:109-121`
- Code:
```ts
// order-service cancelUnpaid: every PENDING_PAYMENT order older than ORDER_HOLD_HOURS
where: { status: 'PENDING_PAYMENT', createdAt: { lte: cutoff } },
...
// payment-service voidForOrder (via order.cancelled)
await this.transition(t, open, 'VOID', 'system', reason, {
  voidReason: reason,
  trxId: null,
  voidedTrxId: open.trxId,
});
...
// summaryByOrder (the only payment view the admin order detail and tracking get)
where: { orderId, status: { not: 'VOID' } },
```
- Problem and impact: a bKash/Nagad customer sends the money and enters the trxId, so the payment is SUBMITTED. If staff do not verify within ORDER_HOLD_HOURS (default 48h, for example over a weekend or holiday), order-service cancels with PAYMENT_TIMEOUT. payment-service then voids the payment, clears `trx_id` (so the trxId can be used again) and keeps it only in `voided_trx_id`. `summaryByOrder` filters out VOID, so the admin order detail (`admin-orders.controller.ts:101-103`) and customer tracking both show the order as cancelled with no payment at all. No route exposes `voidedTrxId`. Real money has arrived in the shop's wallet, but the system no longer shows it anywhere: there is no refund trail and a likely customer dispute. ADR 0008 accepts the 48h deadline, but not that money received becomes invisible.
- Fix (smallest first):
  1. In `summaryByOrder`, also return the latest VOID payment when there is no other payment, and add a nullable `voidReason` field so the dashboard can show "voided (PAYMENT_TIMEOUT), trxId ...1234". This is a contract change.
  2. Or, in order-service `cancelUnpaid`, skip orders whose payment is SUBMITTED (it would need a payment lookup or a `paymentSubmitted` flag stored when `payment.submitted` is consumed), so they wait for staff instead of expiring.
  3. In any case, write an audit row in `voidForOrder` when `open.trxId` is not null (today void is the only state change with no audit). This part needs no approval.

### QUAL-2: Create idempotency set disagrees with the DB "one open payment" index; the conflict leaks as a 500
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/apps/payment-service/src/payments/payment-state.ts:23-27`, `backend/apps/payment-service/src/payments/payment.service.ts:78-94,125-130`, `prisma/migrations/20261019024101_payments/migration.sql:61`
- Code:
```ts
export const OPEN_PAYMENT_STATUSES = ['SUBMITTED','COD_PENDING','COD_CONFIRMED'];
```
```sql
CREATE UNIQUE INDEX "payments_one_open_per_order" ON "payments" ("order_id") WHERE "status" NOT IN ('VOID', 'REJECTED');
```
```ts
if (isUniqueViolation(err, 'trx_id')) { throw new AppError('TRX_ID_ALREADY_USED', ...409) }
throw err;
```
- Problem and impact: the DB counts VERIFIED and COLLECTED as "open", but `create`'s idempotency lookup does not. Two cases hit `payments_one_open_per_order`: a saga retry or a duplicate create after the payment is VERIFIED, and two concurrent creates for one order (both see nothing, then both insert). Either way the error is a raw P2002 on `order_id`. It is not mapped, so all-exceptions.filter returns 500 INTERNAL_ERROR, and the checkout saga compensates (voids) instead of returning the existing payment idempotently. Data integrity holds, because the DB blocks the duplicate. The visible effect is a spurious failure.
- Fix: use `status: { notIn: ['VOID','REJECTED'] }` in the idempotency `findFirst`, so it matches the index. Map `isUniqueViolation(err,'order_id')` to a re-read that returns the existing payment, or to 409 PAYMENT_ALREADY_EXISTS.

### ARCH-3: Payment lifecycle stops at VERIFIED / COD_CONFIRMED: COLLECTED is unreachable and refunds never reach payment-service
- Severity: Low / Confidence: Confirmed / Effort: M / Needs approval: yes (new event subscriptions or states could change payload or contract shapes)
- Location: `backend/apps/payment-service/src/payments/payment-state.ts:5-15`, `backend/apps/payment-service/src/payments/payment.handlers.ts:14-37`
- Code:
```ts
 * COD:           COD_PENDING -> COD_CONFIRMED -> COLLECTED (VOID before collection)
  COD_CONFIRMED: ['COLLECTED', 'VOID'],
```
- Problem and impact: no code path ever transitions to COLLECTED. A grep for `COLLECTED` finds only the state table and the contracts. The only events consumed are order.cancelled and privacy.erased, so order DELIVERED, RETURNED and REFUNDED (order-state.ts:8-12) never reach payments. Delivered COD orders stay COD_CONFIRMED forever. A refunded order's advance stays VERIFIED with no refund record. Separately, verify does not check order state. Staff can verify in the window after an admin cancel, before order.cancelled is consumed (outbox poll plus consumer). That produces a VERIFIED advance on a CANCELLED order. order-service only logs `payment.verified ... no change` (order.service.ts:95), with nothing flagged for refund. Payment records cannot serve as the accounting source that ADR 0020 and the handler comment ("verified advances stay for refund handling") assume.
- Fix: consume `order.delivered` -> COD_CONFIRMED to COLLECTED. Add a REFUNDED payment state (or a refund row) driven by order REFUNDED. Emit an audit or alert when payment.verified lands on a non-PENDING order.

### QUAL-4: No tests for PaymentService (the money path)
- Severity: Medium / Confidence: Confirmed / Effort: M / Needs approval: no
- Location: `backend/apps/payment-service/src/payments/payment.spec.ts:1-65` (state machine and providers only), `backend/apps/payment-service/test/health.e2e-spec.ts`
- Code:
```ts
describe('payment state machine', () => { ... canTransitionPayment ... });
describe('payment providers', () => { ... manual.begin / cod.begin ... });
```
- Problem and impact: nothing exercises `create` (idempotent replay, PAYMENT_ALREADY_EXISTS, the P2002 to TRX_ID_ALREADY_USED mapping, which depends on Prisma error meta format and breaks silently on a Prisma upgrade), `verify` (AMOUNT_MISMATCH, COD rejected, the payment.verified plus audit outbox rows), `voidForOrder` (frees trxId, idempotent) or the event handlers. The only TRX_ID_ALREADY_USED test is in order-service with a mocked participant. Regressions here are money bugs.
- Fix: add a Prisma-mocked or Testcontainers spec for PaymentService covering the cases above. At minimum, add one integration test that inserts a duplicate trxId and asserts 409 TRX_ID_ALREADY_USED against real Postgres.

### DEAD-5: `FakePaymentProvider` is never used
- Severity: Low / Confidence: Confirmed (grep for `FakePaymentProvider` across apps and libs finds only its definition) / Effort: S / Needs approval: yes (deletes code)
- Location: `backend/apps/payment-service/src/payments/payment.provider.ts:50-62`
- Code:
```ts
/** Test double: records what it was asked to start. */
export class FakePaymentProvider implements PaymentProvider {
  readonly started: NewPayment[] = [];
```
- Problem and impact: a test double ships in production code and no test uses it. This is minor clutter.
- Fix: use it in the PaymentService tests from QUAL-4 (moving it to a `*.testing.ts` file), or delete it.
