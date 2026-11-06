# 01 — Findings (audit 2026-11-06)

**Coverage.** Full detail for each service finding (file:line, code excerpt, impact, fix) is in [services/](services/).
- **Fully audited:** identity, inventory, payment, shipping, notification and analytics, plus the shared libs (`libs/common` messaging, outbox and RPC, which the main session reviewed itself).
- **Not audited:** gateway (beyond setup and auth wiring), catalog, order-service, frontend, dashboard and infra. The agents for these hit the usage limit before they finished. They are the next audit pass (see 02-final-report.md).

Confidence: **C** = Confirmed, **L** = Likely, **R** = Needs runtime check.

## Summary

| ID | Sev | Conf | Area | Title | Approval? | Status |
|---|---|---|---|---|---|---|
| SEC-001 | Critical | C | deps | `next` 16.3.8: unauthenticated RCE (image optimizer with SVG, `use cache`) and server-action DoS. Also body-parser/multer DoS and a zod memory-exhaustion bug | no | **fixed** 6a6e221 |
| ID-SEC-1 | High | C | identity | A phone number added to a customer account is never verified. When the owner later adds that phone to the team, the customer row is promoted to STAFF/OWNER and keeps its sessions and pending reset links: a dashboard takeover | **yes** (auth flow) | open |
| ID-SEC-2 | High | C | identity | Pre-registration takeover: an attacker registers the victim's email first, and their password survives the victim's email verification | **yes** (auth flow) | open |
| SEC-005 | High | C | deps | `nodemailer` 7.0.10 has 20 advisories (CRLF/SMTP injection, ReDoS). The fix is 10.1.4+ | **yes** (major upgrade) | open |
| SEC-002 | Medium | C | notification | `ConsoleSmsProvider` is the production SMS provider, and it logged the full phone and the SMS body (order code) at info level | no | **fixed** ebe8186 |
| SEC-003 | Medium | C | notification | SMTP `requireTLS: false` on port 587, so an on-path attacker can strip STARTTLS and read the SMTP login and reset links | no | **fixed** 94e174f |
| SEC-004 | Medium | C | gateway | No security headers on the public API: no helmet, `x-powered-by: Express` is exposed, no nosniff/HSTS/frame policy | no | **fixed** a3196dd |
| MSG-001 | Medium | C | inventory | One reservation whose `release()` throws aborts the whole sweep. It sorts first every time, so all reservation expiry stops (`inventory.service.ts:202-214`) | no | **fixed** 696f84d |
| INV-MSG-1 | Medium | L | inventory | A late `order.placed`, or the 48h hold expiring, can release stock for an order that is later confirmed. `commit()` then silently does nothing | no | open |
| INV-MSG-2 | Medium | C | inventory | Cancelling a CONFIRMED order never restocks: `release()` ignores COMMITTED reservations | **yes** (new column) | open |
| NOTIF-MSG-1 | Medium (High at M3) | C | notification | The SMS is sent inside the consumer DB transaction. A rollback or retry re-sends it, and a slow gateway holds DB connections | no | open (M) |
| SHIP-MSG-1 | Medium (High at M3) | C | shipping | `createShipment` runs check → `book()` → insert with no reservation. A double-click books twice, and a P2002 error surfaces as a 500 | no | open (M) |
| SHIP-ARCH-1 | Medium | C | shipping | Shipment and order status are not linked: a shipment can be booked for a cancelled order, and cancelling an order leaves its shipment BOOKED | partly | open |
| PAY-ARCH-1 | Medium | C | payment | Auto-cancel after 48h voids a submitted bKash/Nagad trxId, after which admins can no longer see the money received | **yes** | open |
| AN-DB-1/2/3, AN-SEC-1 | Medium | C | analytics | The funnel query does a full scan of `tracked_events`. Beacon rows are never deleted (retention needs your decision). An erasure leaves the visit id linked to the order. The expense list truncates at 2000 rows, so P&L is wrong | DB-2 yes | open |
| ID-SEC-3/4 | Medium | C | identity | Admin passwords skip the common-password check. Customer accounts are not covered by privacy erasure | SEC-4 yes | open |
| QUAL-001 | Low | C | shipping | Float maths in the volumetric weight adds 1 g. At an exact kg boundary that bills an extra kg (250×352×500 mm, divisor 4000 → 12 kg instead of 11) | no | **fixed** 994ac80 |
| QUAL-002 | Low | C | backend tests | The gateway e2e `beforeAll` runs under jest's default 5 s hook timeout, so 22–34 tests fail when the machine is busy. Each suite passes when run alone | no | **fixed** d3f88c2 |
| OPS-001 | Low | C | build | `turbo run build` cannot pass `ALLOW_TEST_TURNSTILE` (strict env mode), so a local `pnpm build` of the frontend always fails without a real key | no | open |
| ARCH-001 | Low (deploy rule) | C | libs/common | TCP between services has no authentication. Services trust `meta.actor` from any caller (`rpc-context.interceptor.ts:12-18`), so the step 1.6 production compose **must** keep ports 4001-4008 on a private network | yes to change | open |
| others | Low | C/L | all | ~20 Low items: dead RPCs and providers, missing tests (PaymentService, CustomerService), unvalidated internal TCP inputs, unbounded token tables, `javascript:` tracking URLs, etc. | – | see services/ |

## Needs your approval (Ground Rule 4)

1. **ID-SEC-1**: refuse to promote a CUSTOMER row to the team, or revoke all its sessions and tokens when doing so. Also require role CUSTOMER in `consume()`. *Recommended first. Small change.*
2. **ID-SEC-2**: make verify-email ask for the password, or keep the pending password on the token row and only apply it after verification.
3. **SEC-005**: upgrade `nodemailer` 7 → 10.x (major version; the email provider only uses `createTransport`/`sendMail`, so low risk).
4. **INV-MSG-2**: restock on cancel after commit. Needs a new nullable `restocked_at` column.
5. **PAY-ARCH-1**: decide whether auto-cancel should skip orders whose payment is still SUBMITTED.
6. **AN-DB-2**: choose a retention period for `tracked_events` (privacy/legal decision).
7. **ID-SEC-4**: extend privacy erasure to customer accounts (new consumer; erase semantics).
8. **ARCH-001**: decide whether to add a shared-secret/mTLS check on the TCP transport, or rely on network isolation (document it in ADR).
