# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added
- Services (ADR 0014): Zelqune Interior Design (homes, offices, restaurants and cafés, hotels,
  shops) and Zelqune Construction (ground up to finished interiors). Requests are RFQs of kind
  `DESIGN` / `CONSTRUCTION` with a brief (space/building type, area, district, budget, floors),
  tracked by code + phone, listed for admins by kind, owner alerted by SMS; never priced as
  product quotes.
- Product range in a dev-only demo catalog (`pnpm seed:demo`): Diamond Shelf, Wave Shelf,
  Half-Moon Planter Light, Fluted Niche Panel, Capsule Vase Light; categories Wall panels,
  Shelves, Lighting.

### Changed
- Storefront redesign (references: RH, Ferm Living): brand v2 from the owner's logo (vector
  arch mark, ink on cream, walnut and amber glow), Cormorant Garamond + Manrope (Hind
  Siliguri for Bangla, self-hosted and preloaded on /bn only), editorial landing page (hero, values, featured product,
  day/night, craft and pre-order steps, rooms, business band, FAQ), redesigned product,
  collection, checkout, tracking, bulk and text pages, new "Our story" page (ADR 0013).
- Storefront architecture: feature folders, Redux Toolkit with RTK Query generated from the
  gateway OpenAPI spec, listener-based analytics, zod-validated env (ADR 0013).
- Sample photography (Unsplash License) until real product photos exist.

### Added
- Step 1.4: storefront (Next.js 16) in English (default, `/en`) and Bangla (`/bn`): home,
  shop/category, product page (gallery, finish picker, sale-mode badge with lead time,
  delivery fee estimate, Product JSON-LD), cart drawer, guest checkout (phone only,
  district/area, zone fee, COD or bKash/Nagad ৳300 advance with trxId, Turnstile,
  Idempotency-Key), order placed + tracking, Bulk & Corporate RFQ + quote tracking,
  terms/returns/privacy/FAQ, sitemap, robots, OG image (ADR 0012).
- Price experiment `?p=a|b` sticky for 90 days; anonymous session id and first-touch UTM
  sent with VIEW / ADD_TO_CART events and checkout; Meta Pixel behind `NEXT_PUBLIC_META_PIXEL_ID`.
- Copy from `docs/copy-en.md` / `docs/copy-bn.md` (plus interface strings for review);
  `[[...]]` placeholders stay visible; `pnpm --filter @zelqune/frontend copy:check` lists them.
- `GET /v1/shipping/estimate` (delivery fee for one variant before a cart exists).
- Playwright checkout and RFQ paths against the real backend, `storefront-e2e` CI job,
  `pnpm screenshots`.
- Step 1.3: analytics-service (funnel from beacons + order events, revenue by BD day, channels,
  per-experiment conversion, **GO counter** = B2C, not isFriend, active status, verified advance;
  audit log), notification-service (SmsProvider with console fake, Bangla templates per order
  stage, owner alert for bulk requests).
- Gateway admin API (OWNER/STAFF): orders list/filter/detail/CSV, notes, transitions,
  shipments, payment verify/reject/confirm-COD, customer isFriend, catalog CRUD (categories,
  products, variants, prices, experiments, media), stock, dashboard; audit log OWNER only.
- Audit trail: every admin change writes `audit.recorded` in the same transaction (ADR 0010).
- B2B (section 5ক, M1): public RFQ, quotes with pricing, 20% discount guard (OWNER override),
  7-day validity and auto-expiry, conversion to B2B orders at quoted prices (ADR 0011);
  `Order.channel`, `Order.organizationId`, `Price.priceListId` (RETAIL).
- Analytics beacon `POST /v1/events`; `CUSTOMER_KEY_SECRET` (HMAC customer key for analytics).
- Step 1.2: inventory-service (stock, 15-min reservations held for 48 h after ordering,
  movements, no overselling under concurrency), shipping-service (64 districts, DHAKA ৳70 /
  SUBURB ৳110 / OUTSIDE ৳130 + ৳20 per extra kg on chargeable weight = max(actual,
  volumetric)), payment-service (COD, manual bKash/Nagad with globally unique trxId, payment
  state machine, PaymentProvider), order-service (guest carts, orchestrated checkout saga with
  compensations and recovery, order state machine, random order codes, tracking by code +
  phone, unpaid-order cancellation) (ADR 0008).
- Fixed ৳300 advance for pre-order and made-to-order (configurable; percent mode optional).
- Gateway: districts, guest cart, quote, checkout (Turnstile, cart-scoped Idempotency-Key,
  rate limits), order tracking.
- Events `order.placed`, `order.confirmed`, `order.cancelled`, `stock.reserved`,
  `stock.released`, `payment.submitted`, `payment.verified`.
- Event consumers retry through delay queues before the DLQ (ADR 0009, #2).
- Variant packaged dimensions/weight for shipping.
- Step 1.1: identity-service with E.164 phone users (+8801…, Bangla digits accepted), roles
  OWNER/STAFF/CUSTOMER, argon2id admin passwords, ES256 access tokens and rotating refresh
  tokens with reuse detection (ADR 0006).
- Gateway admin auth: `POST /v1/admin/auth/login|refresh|logout`, `GET /v1/admin/auth/me`;
  refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie; default-deny JWT guard and
  role guard; per-IP rate limits in Redis and a per-phone lock that counts failed logins only.
- catalog-service: category tree, bilingual products with sale modes and SEO, variants, media,
  price history and price experiments (`?p=a|b`); media via `StorageProvider` (R2 presigned PUT,
  local fake) (ADR 0007); admin use-cases over TCP (HTTP routes in step 1.3).
- Public catalog API: `GET /v1/catalog/categories`, `/v1/catalog/products`,
  `/v1/catalog/products/{slug}`; only ACTIVE products, active variants and READY media.
- Events `product.published`, `product.updated`, `price.changed` through the outbox.
- `pnpm keys:dev`, idempotent `pnpm seed` (OWNER admin + Alo-Arch Panel pre-order catalog),
  `backend/scripts/new-migration.sh`, gateway end-to-end suite on real infrastructure in CI.

### Fixed
- Idempotency-Key is scoped to the caller (user or guest cart) and replays the original status
  code and Location header (#3).
- Service errors sent over TCP reached the gateway as 503: the exception filter was not applied
  to the hybrid microservice transport (present since step 1.0).
- Monorepo with pnpm workspaces and Turborepo: `backend/`, `frontend/`, `dashboard/`,
  `packages/api-client`, `packages/ui-tokens`, `infra/`, `docs/`.
- Backend skeleton (build plan step 1.0): NestJS gateway (REST `/v1`, Swagger `/docs`, aggregated
  `/health`) and 8 private services over TCP, each with its own Prisma schema and migrations.
- `libs/common`: typed env config, pino logging with `x-request-id`, global error filter, health
  module, `Idempotency-Key` interceptor, transactional outbox and RabbitMQ publisher/consumer with
  processed-event tracking. `libs/contracts`: versioned event envelope and RPC contracts.
- Dev docker-compose: Postgres (one schema and role per service), RabbitMQ, Redis, all apps.
- CI workflows per area, PR and issue templates, CODEOWNERS, Dependabot.
- Architecture overview and ADRs 0001–0005.
