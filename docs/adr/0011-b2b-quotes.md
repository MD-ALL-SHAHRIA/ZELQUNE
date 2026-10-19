# 0011. B2B in M1: RFQ -> priced quote -> B2B order, with forward-compatible fields

- Status: Accepted
- Date: 2026-10-19

## Context
Section 5ক: sell to businesses (interior firms, cafés, hotels, corporate gifts) from the same
platform, but validate demand before building accounts, price lists and payment terms (M2).
B2B needs larger quantities, custom work and negotiated prices; ads cost (~৳500/order) does not
apply, so ~20% below retail still leaves a margin [estimate].

## Decision
- **Public RFQ** (`POST /v1/quote-requests`, Turnstile, 5/hour/IP): organization, contact,
  phone, email, items (free text, optional product/variant) with qty, needed-by, customization
  notes. Stored as a `Quote` (code `QT-XXXXXX`) in order-service; `quote.requested` alerts the
  owner by SMS.
- **Pricing** (admin): each line gets a catalog variant and a unit price; plus shipping, a custom
  advance and `validUntil` (default `QUOTE_VALIDITY_DAYS` = 7). A price more than
  `B2B_MAX_DISCOUNT_PERCENT` (20) below the RETAIL price needs **OWNER + allowDeepDiscount**;
  STAFF gets `422 DISCOUNT_TOO_DEEP`. Prices are audited with the retail reference.
- **Lifecycle**: NEW -> QUOTED -> ACCEPTED -> converted; REJECTED / EXPIRED final. QUOTED and
  accepted-but-unconverted quotes **auto-expire** after `validUntil` (sweeper + lazy check).
- **Conversion** runs the checkout saga (ADR 0008) with `channel=B2B`, the **quoted prices and
  shipping fee (never re-resolved from the catalog)**, no per-line quantity cap and the custom
  advance. Advance > 0 is paid via bKash/Nagad (trxId); **advance 0 (COD) is OWNER only**
  (STAFF gets 422).
- **Forward-compatible fields now**: `Order.channel` (B2C|B2B, default B2C),
  `Order.organizationId` (nullable), `Price.priceListId` (default RETAIL; only RETAIL accepted),
  storefront line cap `MAX_LINE_QTY_B2C` in config (10).

## Consequences
- B2B orders are excluded from GO and reported separately in the dashboard.
- Customer acceptance is recorded by staff (phone/email); a customer-facing accept link and PDF
  quotes come in M2 with business accounts, wholesale price lists, MOQ, bank transfer and credit.
