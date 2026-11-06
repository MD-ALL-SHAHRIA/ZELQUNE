# shipping-service audit

## Scope
Read every non-generated file in `backend/apps/shipping-service` (src/main.ts, app.module.ts, config/shipping-env.ts, prisma/prisma.service.ts, shipments/*, settings/shipping-settings.ts, zones/*, prisma/schema.prisma, all 3 migrations, prisma.config.ts, .env.example, test/health.e2e-spec.ts), plus the contracts it uses (`libs/contracts/src/shipping/shipping.contracts.ts`, `shippingSettingsSchema`), `libs/common` SettingsStore / recordAudit / all-exceptions filter, and every caller (gateway shop + admin-orders + admin-settings controllers, order-service `checkout/participants.ts`), and the frontend/dashboard places that render `trackingUrl`.

**Most of the requested focus areas do not exist in the code yet.** There are no courier API integrations (only `ManualCourierProvider`; Steadfast/Paperfly/Pathao are planned for M3, `app.module.ts:25`), no outbound fetch, no courier secrets, no webhook endpoints, no HTTP routes at all (TCP only), no RabbitMQ consumers (`subscribe` is never called), and no domain events (the outbox is used only for audit events). So the "duplicate booking on a redelivered event" scenario can't happen today. The same risk exists, though, in the admin RPC path (see MSG-1).

Checked, OK:
- Every TCP handler checks its `data` with zod: quote (`shippingQuoteRequestSchema.parse`, lines bounded 1..50), shipmentByOrder (`byOrder.parse`), createShipment / updateStatus (`create/updateShipmentInputSchema.parse`), and settings.update (`SettingsStore.update` does `schema.parse`). `districts` / `settings.get` take no input.
- Gateway authZ: the shipment create/update routes are under `@Roles('OWNER','STAFF')` (admin-orders.controller.ts:62). PUT settings/shipping is `@Roles('OWNER')` (admin-settings.controller.ts:95). The public `shipping/estimate` is throttled and its qty is capped at 100. Public tracking needs order code + phone.
- The shipment state machine (`shipment-state.ts`) has an exhaustive unit test. Terminal states have no outgoing edges. `updateStatus` locks the row with `SELECT ... FOR UPDATE` (parameterised `$queryRaw` tagged template, no injection) before checking and changing it, and writes history + audit in the same transaction.
- createShipment calls the provider *before* opening the DB transaction (no network call inside the tx). Audit goes through the outbox inside the tx.
- Quote math: fees are integer paisa (`paisa()` env schema is int/nonnegative; settings use `paisaSchema`). `shippingFee` is pure integer arithmetic. Unknown district gives 422.
- Indexes: `shipments.order_id` is UNIQUE (the only lookup key), `shipment_status_changes(shipment_id)` is indexed, and the outbox has its poll index. No `findMany` anywhere, so no unbounded queries.
- Env is validated at startup through `serviceEnvSchema.extend` (shipping-env.ts). `.env.example` is current and has no real secrets. The DB role is limited to the `shipping` schema.
- No PII is stored (orderId, courier, consignment id, tracking URL only), so not subscribing to privacy events is fine.

## Service map
- Responsibility: delivery zones (64 districts, static in `zones/districts.ts`) and fee quotes; one shipment per order with a status state machine; owner-editable fee settings (ADR 0017).
- Entry: `src/main.ts` -> `bootstrapService(AppModule, 'shipping-service')`. HTTP 3006 (health only), TCP 4006. DB schema `shipping`, role `shipping_svc`.
- Tables: outbox_events, processed_events (unused: no consumers), shipments, shipment_status_changes, settings.
- TCP patterns served: `shipping.districts.list`, `shipping.quotes.quote`, `shipping.shipments.byOrder` (P.shipmentByOrder), `shipping.admin.shipments.create`, `shipping.admin.shipments.updateStatus`, `shipping.admin.settings.get`, `shipping.admin.settings.update`.
- Callers: the gateway (shop districts/estimate/track, admin order detail/shipment create+patch, admin settings) and order-service (`checkout/participants.ts:44`, quote during cart/checkout).
- Calls out: none (no other services, no HTTP).
- Publishes (outbox): audit events only (`recordAudit` for `shipment.create`, `shipment.updateStatus`, `settings.update`). No `shipment.*` domain events.
- Consumes: nothing.

## Findings

### MSG-1: createShipment is check-then-act with no idempotency; a concurrent or retried request gives a 500 now, and will give a duplicate courier booking once API couriers land
- Severity: Medium (latent High for M3) / Confidence: Confirmed (code traced; P2002 not mapped in the filter) / Effort: S / Needs approval: no
- Location: `backend/apps/shipping-service/src/shipments/shipping.service.ts:97-116`
- Code:
```ts
    if (await this.prisma.shipment.findUnique({ where: { orderId: input.orderId } })) {
      throw new AppError('SHIPMENT_EXISTS', 'This order already has a shipment', 409);
    }
    const booking = await provider.book({
      orderId: input.orderId,
      consignmentId: input.consignmentId,
      trackingUrl: input.trackingUrl,
    });
    const status = booking.booked ? 'BOOKED' : 'PENDING';
    const shipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
```
- Problem & impact: The existence check, the external `book()` call and the insert are three separate steps with no lock and no reservation row. Two concurrent requests (a STAFF double-click, or the gateway ServiceClient timing out after 5s and the admin retrying) both pass the check and both call `book()`. The second insert then hits the `shipments_order_id_key` unique constraint. `toErrorPayload` (libs/common/src/errors/all-exceptions.filter.ts) has no Prisma P2002 mapping, so the client sees a 500 INTERNAL_ERROR instead of 409. With `ManualCourierProvider` the only cost today is that 500. Once Steadfast/Pathao providers are added (M3, `app.module.ts:25`), each request books a real parcel at the courier: two pickups / two COD consignments, and one of them is orphaned with no record in our DB. The same applies if a future `order.confirmed` consumer books automatically and the message is redelivered after `book()` succeeded but the tx failed.
- Fix: Reserve first, then book. Insert the shipment as `PENDING` (relying on the unique `order_id`) in a short tx, catch P2002 -> `AppError('SHIPMENT_EXISTS', 409)`, then call `provider.book()` outside any tx, then in a second tx move it PENDING -> BOOKED with the consignment id. A retry then finds the PENDING row and resumes (or refuses) instead of booking again. For API couriers, also pass the shipment id / orderId as the courier's merchant reference (`invoice` for Steadfast, `merchant_order_id` for Pathao) so the courier deduplicates. Optionally add a P2002 -> 409 mapping in the shared filter.

### ARCH-1: Shipment status is completely decoupled from order status (no order check, no events, no reaction to cancellation)
- Severity: Medium / Confidence: Confirmed / Effort: M / Needs approval: yes (adds new event types / an RPC contract call between services)
- Location: `backend/apps/shipping-service/src/shipments/shipping.service.ts:92-99` and `:135-158`; `backend/apps/gateway/src/admin/admin-orders.controller.ts:143-160`
- Code:
```ts
  @Post('orders/:id/shipment')
  createShipment(@Param() { id }: IdParamDto, @Body() body: CreateShipmentDto) {
    return this.services
      .get('shipping')
      .send<ShipmentSummary>(RPC_PATTERNS.shipping.admin.createShipment, { orderId: id, ...body });
  }
```
```ts
  async createShipment(raw: CreateShipmentInput): Promise<ShipmentSummary> {
    const input = createShipmentInputSchema.parse(raw);
    const provider = this.couriers.find((c) => c.courier === input.courier);
    ...
    if (await this.prisma.shipment.findUnique({ where: { orderId: input.orderId } })) {
```
- Problem & impact: Neither the gateway nor shipping-service checks that the order exists or is in a shippable state (READY_TO_SHIP / CONFIRMED). STAFF can create a BOOKED shipment for a CANCELLED, PENDING_PAYMENT (unverified bKash) or nonexistent order id. Shipping-service consumes no events, so cancelling an order leaves its shipment BOOKED. A shipment marked DELIVERED / RETURNED does not move the order (order-service `SHIPPED -> DELIVERED` is a separate manual transition), so the two states drift. The admin has to update both by hand, and the public tracking page (`shop.controller.ts:196-212`) can show "order CANCELLED" next to "shipment BOOKED, track parcel". When M3 couriers book automatically, this becomes real money: parcels sent for cancelled or unpaid orders.
- Fix (minimal, no contract change): in the gateway `createShipment`, fetch the order (`O.detail`, already used in `detail()`) and reject unless its status is CONFIRMED / IN_PRODUCTION / READY_TO_SHIP. Longer term (needs approval): shipping-service subscribes to `order.cancelled` and cancels PENDING/BOOKED shipments (calling the courier cancel API in M3, outside the tx), and publishes `shipment.statusChanged` via the outbox so order-service can move SHIPPED/DELIVERED/RETURNED.

### SEC-1: trackingUrl accepts any URL scheme (javascript:, data:) and is rendered as a public link
- Severity: Low / Confidence: Confirmed (zod 4.6.7 `z.url()` returns success for `javascript:alert(1)` and `data:text/html,hi`, tested with node) / Effort: S / Needs approval: no (tightening validation only)
- Location: `backend/libs/contracts/src/shipping/shipping.contracts.ts:82`, `backend/apps/gateway/src/admin/admin.dto.ts:62`; rendered at `frontend/src/features/orders/track-order.tsx:159-161`, `dashboard/src/app/(admin)/orders/[id]/page.tsx:445-447`
- Code:
```ts
  trackingUrl: z.url().nullable().default(null),
```
```tsx
                  <a
                    href={order.shipment.trackingUrl}
                    rel="noopener noreferrer"
                    target="_blank"
```
- Problem & impact: A STAFF user (or a stolen STAFF session) can store a `javascript:` / `data:` / phishing URL as the tracking link. It is returned by the *public* track endpoint and shown to the customer as the courier link. React 19 blocks `javascript:` hrefs, which limits the XSS impact, but nothing stops an arbitrary off-site phishing link ("pay delivery charge here"). Low because only STAFF/OWNER can set it.
- Fix: `z.url({ protocol: /^https$/ })`, or better, an allowlist of courier tracking hostnames (steadfast.com.bd, paperfly.com.bd, pathao.com, ...) in a shared `trackingUrlSchema` used by both the contract and the gateway DTO. Once API couriers land, build the URL server-side from the consignment id.

### QUAL-1: Volumetric weight uses floating-point division, so exact kg boundaries can round up one extra kg (overcharge)
- Severity: Low / Confidence: Confirmed (brute-force replay of the exact expression) / Effort: S / Needs approval: no
- Location: `backend/apps/shipping-service/src/zones/shipping-fee.ts:28-35`
- Code:
```ts
    if (l && w && h) {
      const cubicCm = (l / 10) * (w / 10) * (h / 10);
      volumetric += line.qty * ((cubicCm / config.volumetricDivisor) * 1000);
    }
  }
  const volumetricWeightGrams = Math.ceil(volumetric);
  const chargeableKg = Math.max(1, Math.ceil(Math.max(actual, volumetricWeightGrams) / 1000));
```
- Problem & impact: The intended value is exactly `l*w*h(mm³)/divisor` grams, but the float chain gives tiny positive errors that `Math.ceil` turns into +1 g. On ~0.7% of dimension combinations tested, a parcel that is exactly N kg volumetric is charged as N+1 kg. Example: a 625×704×125 mm box (divisor 5000) should be 11000 g but comes out as 11001 g, so it is charged 12 kg: +2000 paisa (৳20) at default settings. Summing floats across up to 50 lines adds more error. The quote is persisted into the order total, so the customer is overcharged.
- Fix: integer math: `volumetricGrams += Math.ceil(line.qty * l * w * h / config.volumetricDivisor)` per line (all ints, well within 2^53 for the bounded inputs), or compute with BigInt and ceil once. Add a spec case for 625×704×125 -> 11000 g.

## Notes for M3 (not findings, code does not exist yet)
When adding Steadfast/Paperfly/Pathao providers: put a fetch timeout (`AbortSignal.timeout`) on every call and keep it shorter than the gateway's 5s RPC timeout, or move booking to an async job. Never call the courier inside `$transaction`. Put API keys in `shippingEnvSchema` (optional, validated) and `.env.example`. Any courier webhook route at the gateway must be `@Public()` but must verify a signature / shared secret with a constant-time compare, and must drive status only through `canTransitionShipment` (ignoring out-of-order callbacks). Never fetch the URLs that couriers return.
