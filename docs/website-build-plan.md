# Zelqune ই-কমার্স: আর্কিটেকচার আর Claude Code বিল্ড প্ল্যান (v3, মাইক্রোসার্ভিস)

**তারিখ:** ১৮ অক্টোবর ২০২৬ · **বানাবেন:** মালিক, নিজের Claude Code (Pro) দিয়ে · **প্রি-অর্ডার টেস্টের নিয়ম:** [website-spec.md](website-spec.md)

> **লক্ষ্য:** একটা পুরো ই-কমার্স সিস্টেম, যেখানে ক্যাটালগ, কার্ট, চেকআউট, অ্যাকাউন্ট, অর্ডার, ডেলিভারি, কুপন আর অ্যাডমিন সবই থাকবে। প্রি-অর্ডার আলাদা কোনো সাইট নয়। এটা প্রতিটা পণ্যের একটা **বিক্রির ধরন**: পণ্য হয় স্টকে থাকবে, নয়তো অর্ডার অনুযায়ী বানানো হবে, নয়তো প্রি-অর্ডারে বিক্রি হবে।
> কাজ হবে **মাইলস্টোনে**। M1 শেষ হলেই প্রি-অর্ডার টেস্ট চালানো যাবে, বাকিটা পরে যোগ হবে। এতে বিক্রি শুরুর জন্য পুরো সাইট শেষ হওয়ার অপেক্ষা করতে হবে না।

## ১. আর্কিটেকচার: তিনটা আলাদা প্রজেক্ট, ব্যাকএন্ড মাইক্রোসার্ভিস

```
zelqune-backend/      NestJS মাইক্রোসার্ভিস (Nx বা Nest monorepo mode; প্রতিটা সার্ভিস আলাদা app)
├─ apps/gateway            API Gateway: একমাত্র পাবলিক এন্ট্রি, REST /v1 + Swagger, auth যাচাই, rate limit
├─ apps/identity-service   ইউজার, OTP, অ্যাডমিন, ভূমিকা, JWT ইস্যু
├─ apps/catalog-service    ক্যাটেগরি, পণ্য, ভ্যারিয়েন্ট, ছবি, দাম, A/B, CMS
├─ apps/inventory-service  স্টক, রিজার্ভেশন, মুভমেন্ট
├─ apps/order-service      কার্ট, চেকআউট, অর্ডার, কুপন (checkout saga-র orchestrator)
├─ apps/payment-service    COD, ম্যানুয়াল bKash/Nagad, পরে গেটওয়ে (PaymentProvider)
├─ apps/shipping-service   জোন ও ফি, শিপমেন্ট, কুরিয়ার (CourierProvider)
├─ apps/notification-service  SMS/ইমেইল (SmsProvider), শুধু ইভেন্ট শোনে
├─ apps/analytics-service  Event, ফানেল, GO কাউন্টার, অডিট লগ সংগ্রহ
├─ libs/contracts          শেয়ার করা DTO, ইভেন্টের নাম ও পে-লোড (versioned), zod
├─ libs/common             logger, config, error, idempotency, outbox, health
└─ docker-compose.yml      Postgres, RabbitMQ (বা NATS), Redis, সব সার্ভিস

zelqune-frontend/     Next.js App Router স্টোরফ্রন্ট (bn ডিফল্ট, en), শুধু gateway-কে কল করে
zelqune-dashboard/    Next.js অ্যাডমিন ড্যাশবোর্ড, শুধু gateway-কে কল করে
```

**মাইক্রোসার্ভিসের নিয়ম:**
- **প্রতিটা সার্ভিসের নিজের ডেটাবেস।** শুরুতে খরচ বাঁচাতে একই Postgres সার্ভারে আলাদা schema রাখা হবে, যেমন `catalog`, `orders`। এক সার্ভিস আরেক সার্ভিসের টেবিল সরাসরি পড়তে পারবে না।
- **যোগাযোগ দুই ধরনের:**
  - গেটওয়ে থেকে সার্ভিসে সিঙ্ক কল যাবে TCP বা gRPC দিয়ে (Nest microservice transport)।
  - সার্ভিসগুলোর নিজেদের মধ্যে অ্যাসিঙ্ক ইভেন্ট যাবে RabbitMQ দিয়ে, যেমন `order.placed`, `payment.verified`, `stock.reserved`।
- **Outbox pattern:** DB-তে লেখা আর ইভেন্ট পাঠানো একই transaction-এ হবে। এতে কোনো ইভেন্ট হারাবে না। যে সার্ভিস ইভেন্ট গ্রহণ করবে, সেটা idempotent হবে, অর্থাৎ একই ইভেন্ট দুবার এলে কাজ দুবার হবে না।
- **চেকআউট saga:** ধাপগুলো order-service চালাবে। প্রথমে inventory-কে স্টক রিজার্ভ করতে বলবে, তারপর payment-কে পেমেন্টের অনুমোদন চাইবে। কোনো ধাপ ব্যর্থ হলে আগের ধাপগুলো উল্টে দেওয়া হবে (compensation), যেমন রিজার্ভ করা স্টক ছেড়ে দেওয়া।
- **কন্ট্র্যাক্ট:** ফ্রন্টএন্ড আর ড্যাশবোর্ড টাইপ নেবে gateway-র OpenAPI থেকে, যেমন `openapi-typescript` দিয়ে জেনারেট করে। আলাদা রিপো হলেও তাই টাইপ মিলবে।
- **নিরাপত্তা:**
  - JWT ইস্যু করবে identity-service, যাচাই করবে gateway।
  - ভেতরের সার্ভিসগুলো বাইরে থেকে পৌঁছানো যাবে না, শুধু প্রাইভেট নেটওয়ার্কে থাকবে।
  - প্রতিটা অনুরোধে `x-request-id` থাকবে, যাতে কোনো সমস্যা হলে কোন অনুরোধ কোন সার্ভিসে গেছে তা পুরোটা খুঁজে পাওয়া যায় (tracing)।
- **পর্যবেক্ষণ:** প্রতিটা সার্ভিসে pino লগ, `/health` endpoint, আর OpenTelemetry trace। গ্রাহকের কাছে পৌঁছানো ত্রুটি ধরবে Sentry।

**ডিজাইনের মূল নিয়ম (সব সার্ভিসে):**
- **লেয়ার:** controller/handler → service → repository।
- **টাকা:** সব হিসাব **পয়সায়, integer হিসেবে**। যেমন ৩,৪৯০ টাকা = 349000।
- **Idempotency:** অর্ডার আর পেমেন্টের অনুরোধে `Idempotency-Key` থাকবে।
- **স্টক:** রিজার্ভেশনের মেয়াদ (TTL) ১৫ মিনিট। পেমেন্ট বা COD নিশ্চিত হলে স্টক চূড়ান্তভাবে কাটা হবে। পুরো কাজটা হবে transaction-এর ভেতরে, row lock সহ।
- **State machine:** অর্ডার, পেমেন্ট আর শিপমেন্টের প্রতিটার আলাদা state machine থাকবে।
- **অডিট:** অ্যাডমিন যা-ই বদলান, তা `audit.recorded` ইভেন্ট হিসেবে analytics-service-এ জমা হবে।
- **ভাষা:** সব লেখা দুই ভাষায় রাখা হবে (`nameBn`, `nameEn`)।

**হোস্টিং ও খরচের বাস্তবতা:**
- ৯টা সার্ভিস আর একটা message broker আলাদা আলাদা চালালে ফ্রি টায়ারে কুলাবে না।
- তাই শুরুতে সবগুলো চলবে **একটা VPS-এ docker-compose দিয়ে** [খরচ যাচাই করতে হবে, আনুমানিক মাসে ৫০০–১,২০০ টাকা]।
- frontend আর dashboard থাকবে Vercel-এ।
- যেকোনো পেইড সার্ভিস নেওয়া হবে শুধু আপনার অনুমোদনে।

## ২. ডেটা মডেল (মূল টেবিল)

| এলাকা | মডেল |
|---|---|
| ক্যাটালগ | Category (tree), Product (slug, name/desc bn+en, saleMode: IN_STOCK / MADE_TO_ORDER / PRE_ORDER, leadTimeDays, status DRAFT/ACTIVE/ARCHIVED, seo), ProductVariant (sku, options যেমন finish/size, weightGrams, dims), Media, ProductCategory |
| দাম | Price (variantId, amountPaisa, compareAtPaisa, startsAt/endsAt), PriceExperiment (key a/b, variantId, amountPaisa, active) |
| স্টক | InventoryItem (variantId, onHand, reserved), StockReservation (cartId, qty, expiresAt), StockMovement (reason, qty, refId) |
| ক্রেতা | User (phone unique +8801…, name, email?, role CUSTOMER/STAFF/OWNER, passwordHash?), Address (district, area/thana, line, isDefault), isFriend (শুধু GO গোনার জন্য) |
| কার্ট | Cart (userId বা guestToken, items), CartItem (variantId, qty, priceSnapshot) |
| অর্ডার | Order (code ZQ-10001, userId, addressSnapshot, subtotal, discount, shippingFee, total, advanceRequired, status, saleMode, utm, experimentKey), OrderItem (snapshot: name, sku, price, qty) |
| পেমেন্ট | Payment (orderId, method COD / BKASH_MANUAL / NAGAD_MANUAL / BKASH_PGW / SSLCOMMERZ, amount, trxId unique, status, verifiedBy, raw json) |
| ডেলিভারি | ShippingZone (DHAKA / SUBURB / OUTSIDE, ফি, অতিরিক্ত কেজির ফি), Shipment (orderId, courier STEADFAST/PAPERFLY/PATHAO/MANUAL, consignmentId, status, trackingUrl) |
| মার্কেটিং | Coupon (code, type PERCENT/FLAT, minSubtotal, maxUses, perUser, startsAt/endsAt), CouponRedemption |
| রিভিউ | Review (orderItemId: শুধু যিনি পণ্য পেয়েছেন, rating, text, photos, status PENDING/APPROVED) |
| অন্যান্য | Banner, Page (শর্তাবলি, রিটার্ন নীতি), FaqItem, Event (VIEW/ADD_TO_CART/CHECKOUT/PURCHASE + utm), AuditLog, OtpCode (hash, expiresAt, attempts) |

**অর্ডারের ধাপ:**
- PENDING_PAYMENT → CONFIRMED → IN_PRODUCTION (শুধু made-to-order বা pre-order পণ্যে) → READY_TO_SHIP → SHIPPED → DELIVERED
- এর বাইরে আছে CANCELLED, RETURN_REQUESTED, RETURNED আর REFUNDED।

## ৩. ফিচার

**স্টোরফ্রন্ট (web):**
- **ব্রাউজ:** হোম (ব্যানার, ক্যাটেগরি, ফিচার করা পণ্য), ক্যাটেগরি বা কালেকশন পাতা (ফিল্টার আর সর্ট), আর সার্চ।
- **পণ্যের পাতা:** গ্যালারি, ভ্যারিয়েন্ট বাছাই, স্টক বা প্রি-অর্ডারের ব্যাজ, ডেলিভারির আনুমানিক সময়, আর ভেরিফায়েড ক্রেতাদের রিভিউ।
- **কার্ট:** লগইন ছাড়াও কাজ করবে। লগইন করলে আগের কার্টের সাথে মিলে যাবে।
- **চেকআউট:** গেস্ট হিসেবে, শুধু ফোন নম্বর দিয়ে করা যাবে।
  - ঠিকানা দিলে জোন অনুযায়ী ডেলিভারি ফি বসবে, তারপর কুপন।
  - পেমেন্ট: COD, বা bKash/Nagad-এ অগ্রিম (ম্যানুয়াল trxId)।
  - প্রি-অর্ডার বা অর্ডার অনুযায়ী বানানো পণ্যে অগ্রিম দেওয়া বাধ্যতামূলক।
- **অর্ডারের পর:** অর্ডার কোড দিয়ে ট্র্যাক করার পাতা।
- **অ্যাকাউন্ট:** ফোন + OTP দিয়ে লগইন। অর্ডারের ইতিহাস, ঠিকানা আর উইশলিস্ট দেখা যাবে।
- **SEO:** sitemap, metadata, Product JSON-LD আর OG ছবি।
- **ট্র্যাকিং:** Meta Pixel + Conversions API, আর GA4। দুটোই env flag দিয়ে চালু বা বন্ধ করা যাবে।

**অ্যাডমিন:**
- **ড্যাশবোর্ড:** আজকের বিক্রি, অর্ডার, কনভার্শন ফানেল, **GO কাউন্টার** আর দামের A/B তুলনা।
- **পণ্য ও স্টক:** পণ্য তৈরি বা এডিট (ভ্যারিয়েন্ট, ছবি, দাম, SEO, saleMode), স্টক সমন্বয় আর মুভমেন্টের ইতিহাস। স্টক কমে গেলে সতর্কবার্তা।
- **অর্ডার:** টেবিলে ফিল্টার করা যাবে। বিস্তারিত পাতায় পেমেন্ট ভেরিফাই, স্ট্যাটাস বদলানো, নোট লেখা, ইনভয়েস PDF আর একসাথে অনেক অর্ডারে কাজ। অর্ডার থেকেই কুরিয়ারে বুকিং দেওয়া যাবে।
- **মার্কেটিং ও কনটেন্ট:** ক্রেতার তালিকা, কুপন, রিভিউ মডারেশন, আর CMS দিয়ে ব্যানার, পেজ আর FAQ।
- **রিপোর্ট ও নিয়ন্ত্রণ:** বিক্রি, পণ্যভিত্তিক লাভ আর COD-এ ব্যর্থ ডেলিভারির হার। স্টাফের ভূমিকা আর অনুমতি, অডিট লগ, আর CSV এক্সপোর্ট।

## ৪. বাইরের সার্ভিস: আগে যাচাই করতে হবে
- **পেমেন্ট গেটওয়ে (SSLCommerz, bKash PGW):** মার্চেন্ট অ্যাকাউন্ট লাগবে। সম্ভবত ট্রেড লাইসেন্স আর ব্যবসার ব্যাংক অ্যাকাউন্টও লাগবে [যাচাই করতে হবে]। তাই M1-এ শুধু ম্যানুয়াল bKash আর COD থাকবে। গেটওয়ে যোগ হবে M3-এ, একটা `PaymentProvider` ইন্টারফেস দিয়ে, যাতে পরে আরেকটা প্রোভাইডার সহজে লাগানো যায়।
- **SMS OTP:** BD-র SMS গেটওয়েতে প্রতি SMS-এ টাকা লাগে [দাম যাচাই করতে হবে]। ডেভেলপমেন্টের সময় OTP শুধু কনসোলে দেখাবে। লাইভ সার্ভিসে চালু হবে আপনার অনুমতি নিয়ে।
- **কুরিয়ার API (Steadfast, Paperfly, Pathao):** মার্চেন্ট অ্যাকাউন্ট আর API key লাগবে। প্রতিটার জন্য একটা `CourierProvider` adapter হবে। M1-এ বুকিং হাতে, শুধু consignment ID লিখে রাখা হবে।
- **খরচ:** যেকোনো পেইড সার্ভিস, ডোমেইন বা হোস্টিং প্ল্যান নেওয়া হবে শুধু আপনার সিদ্ধান্তে আর অনুমোদনে।

## ৫. মাইলস্টোন

| মাইলস্টোন | কী থাকবে | কেন এই ক্রমে |
|---|---|---|
| **M1: বিক্রি শুরু** | কাঠামো, ক্যাটালগ, পণ্যের পাতা, কার্ট, গেস্ট চেকআউট (COD + ম্যানুয়াল bKash), অর্ডার ট্র্যাকিং, অ্যাডমিনে পণ্য আর অর্ডার, GO কাউন্টার, Pixel | প্রি-অর্ডার টেস্ট আর প্রথম বিক্রি এটা দিয়েই চলবে |
| **M2: পুরো দোকান** | OTP অ্যাকাউন্ট, স্টক রিজার্ভেশন, কুপন, ক্যাটেগরি, ফিল্টার আর সার্চ, CMS, ইনভয়েস, রিপোর্ট | পণ্য ৩–৫টার বেশি হলে দরকার হবে |
| **M3: স্বয়ংক্রিয়** | পেমেন্ট গেটওয়ে, কুরিয়ার API, SMS নোটিফিকেশন, রিভিউ, Conversions API, রিটার্ন আর রিফান্ড | অর্ডার বাড়লে, আর মার্চেন্ট অ্যাকাউন্ট খোলার পর |
| **M4: বড় হওয়া** | ইংরেজি সংস্করণ, আন্তর্জাতিক শিপিং, ইন্টেরিয়রের কাজের অনুরোধ (consultation booking) | ভবিষ্যতে |

## ৬. Claude Code দিয়ে কাজের নিয়ম
1. প্রতিটা ধাপ **plan mode**-এ শুরু করবেন (Shift+Tab)। প্ল্যান পড়ে দেখবেন, তারপর কোড লিখতে দেবেন।
2. **এক সেশনে একটা সার্ভিস বা একটা ধাপ।** শেষ হলে lint, typecheck আর test চালাবেন, diff পড়বেন, commit করবেন, তারপর `/clear`।
3. তিনটা প্রজেক্টের প্রতিটার `docs/` ফোল্ডারে এই ফাইল আর website-spec.md কপি করবেন। প্রতিটার রুটে নিচের মতো একটা করে CLAUDE.md রাখবেন।
4. Pro প্ল্যানে ব্যবহারের সীমা আছে। একবারে একটা সার্ভিস বানাবেন।
5. কোনো ধাপে আটকে গেলে, বা রিভিউ লাগলে, diff বা error-টা এই থ্রেডে পাঠাবেন।

### zelqune-backend/CLAUDE.md
```markdown
# Zelqune backend
NestJS microservices for a Bangladeshi home decor e-commerce. Architecture: docs/website-build-plan.md section 1.

## Layout
Nest monorepo (or Nx). apps/: gateway, identity-service, catalog-service, inventory-service, order-service,
payment-service, shipping-service, notification-service, analytics-service. libs/: contracts, common.
Infra via docker-compose: Postgres (one schema per service), RabbitMQ, Redis.

## Rules
- TypeScript strict, no `any`. Only the gateway is public (REST /v1 + Swagger); services are private.
- Each service owns its schema; never read another service's tables. Share data only via RPC or events.
- Sync: gateway -> service via Nest microservice transport (TCP/gRPC). Async: RabbitMQ events named
  `<entity>.<pastTenseVerb>` with versioned payloads in libs/contracts.
- Outbox pattern for every published event; consumers are idempotent (store processed event ids).
- Checkout is a saga orchestrated by order-service with compensations (release stock, void payment).
- Money is integer paisa. Order/payment creation needs Idempotency-Key.
- Order, payment and shipment status change only through state machines (unit tested).
- External providers (payment, courier, SMS) behind interfaces with fake implementations for dev/tests.
- Every request carries x-request-id; pino logs, /health per service, OpenTelemetry traces.
- Secrets only in env; keep .env.example current.
- Tests: unit for services/state machines, e2e via gateway with Supertest, contract tests for events.
- Before finishing: lint, typecheck, test; fix failures; summarize changes.
```

### zelqune-frontend/CLAUDE.md এবং zelqune-dashboard/CLAUDE.md
```markdown
# Zelqune frontend (storefront)  |  # Zelqune dashboard (admin)
Next.js App Router, TypeScript strict, Tailwind + shadcn/ui. Brand tokens: walnut #4A3426, cream #F4ECDF, amber #E3A857.
Talks ONLY to the backend gateway (NEXT_PUBLIC_API_URL). API types generated from gateway OpenAPI with
openapi-typescript (`pnpm gen:api`); never hand-write API types.
- Storefront: Bangla default + English, mobile-first, SSG/ISR, next/image, Lighthouse mobile >= 90, minimal client JS.
- Dashboard: auth via httpOnly cookies, role-aware UI (OWNER/STAFF), TanStack Table for lists.
- Never invent reviews, ratings, sold counts, scarcity or fake countdowns.
- Playwright tests for critical flows. Before finishing: lint, typecheck, test.
```

## ৭. M1-এর ধাপের প্রম্পট (প্রতিটা আলাদা সেশনে)

**ধাপ ১.০: ব্যাকএন্ডের কাঠামো** (zelqune-backend)
> Read CLAUDE.md and docs/website-build-plan.md. Scaffold the Nest monorepo with all apps and libs listed. libs/common: config, pino logger with x-request-id, error filter, health module, idempotency interceptor, transactional outbox + RabbitMQ publisher/consumer helpers. docker-compose with Postgres, RabbitMQ, Redis and every service. Prisma per service with its own schema. Each service boots with /health; gateway exposes Swagger. GitHub Actions: lint, typecheck, test. Plan first.

**ধাপ ১.১: identity আর catalog সার্ভিস**
> Implement identity-service (users with phone +8801 normalization, admin users with argon2, roles OWNER/STAFF/CUSTOMER, JWT access + refresh issue/rotate) and catalog-service (Category, Product with saleMode IN_STOCK/MADE_TO_ORDER/PRE_ORDER and leadTimeDays, ProductVariant, Media with R2 presigned upload, Price, PriceExperiment) per section 2. Gateway routes for public catalog and admin auth with guards. Seed: product "Alo-Arch Panel" PRE_ORDER, variants WALNUT/NATURAL, experiments a=349000 b=429000, OWNER from env. Tests. Plan first.

**ধাপ ১.২: inventory, order, payment, shipping সার্ভিস + saga**
> Implement inventory-service (InventoryItem, reservations with 15-min TTL, movements), order-service (guest cart by token, checkout saga, Order/OrderItem snapshots, order state machine, track by code + phone), payment-service (COD, manual bKash/Nagad trxId unique, payment state machine, PaymentProvider interface), shipping-service (zones DHAKA/SUBURB/OUTSIDE with fees, manual shipments, CourierProvider interface). Events via outbox: order.placed, stock.reserved, stock.released, payment.submitted, payment.verified, order.confirmed. Saga compensations tested. Gateway routes, rate limiting + Turnstile on checkout. e2e tests through gateway. Plan first.

**ধাপ ১.৩: analytics, notification আর অ্যাডমিন API**
> Implement analytics-service (consume events; store VIEW/ADD_TO_CART/CHECKOUT/PURCHASE with utm and experimentKey; audit.recorded; stats: funnel, revenue, GO count = orders confirmed or later with isFriend=false, per-experiment conversion) and notification-service (consume order/payment events; SmsProvider with console fake). Gateway admin routes: orders list/filter/detail/CSV, verify payment, status transitions, isFriend toggle, shipments, products CRUD, dashboard stats, audit log (OWNER only). Permission tests. Plan first.

**ধাপ ১.৪: স্টোরফ্রন্ট** (zelqune-frontend)
> Read CLAUDE.md and docs. Generate API types from gateway OpenAPI. Build home, category, product page (gallery, variants, IN_STOCK/PRE_ORDER badge, delivery estimate), cart drawer, checkout (phone-only guest, district/area, zone fee, COD or bKash/Nagad advance with trxId, Idempotency-Key), success + order track pages, terms/returns/FAQ. Bangla copy from docs/copy-bn.md (placeholders until provided). Price experiment ?p=a|b persisted in cookie. Meta Pixel (ViewContent, AddToCart, InitiateCheckout, Purchase) + analytics events behind env flag. SEO metadata, sitemap, Product JSON-LD. Playwright checkout test. Plan first.

**ধাপ ১.৫: অ্যাডমিন ড্যাশবোর্ড** (zelqune-dashboard)
> Read CLAUDE.md and docs. Generate API types from gateway OpenAPI. Build login, dashboard (big GO counter, funnel, experiment comparison), products CRUD with image upload, orders table + detail drawer (verify payment, status change, isFriend, shipment, notes), CSV export, audit log (OWNER only), role-aware navigation. Playwright tests for login and verify-payment. Plan first.

**ধাপ ১.৬: ডিপ্লয়ের প্রস্তুতি** (তিনটাই)
> Prepare production without deploying: backend Dockerfiles per service + production docker-compose for a single VPS (Caddy/Nginx reverse proxy with HTTPS, only gateway exposed), migrations on deploy, backups, env checklist; Vercel config for frontend and dashboard; Sentry; README with step-by-step deploy. Do not deploy anything. Plan first.

M2 আর M3-এর প্রম্পট দেব M1 শেষ হলে।

## ৮. সতর্কতা
- **লঞ্চের আগে:** প্রোটোটাইপের আসল ছবি ছাড়া লঞ্চ নয়। ওয়ার্কশপে যাওয়া আর ক্রেতার সাথে কথা বলা কোডের সমান্তরালে চলবে: দিনে বাইরের কাজ, রাতে কোড।
- **সময়:** মাইক্রোসার্ভিসে কাজ বেশি, তাই M1-এর লক্ষ্য ৩–৫ সপ্তাহ [ধারণা, আপনার গতির উপর নির্ভর করবে]। প্রোটোটাইপ আগে তৈরি হয়ে গেলে প্রি-অর্ডার শুরু হবে Facebook-এর মেসেজ আর Google Form দিয়ে, সাইটের অপেক্ষায় থাকবে না। M1 শেষ হওয়ার আগে M2-এর কোনো ফিচার শুরু করবেন না।
- **ডিপ্লয় ও খরচ:** কোড আর ডিপ্লয়ের সিদ্ধান্ত আপনার। কোনো পেইড সার্ভিস নেওয়ার আগে আমাকে জানালে খরচটা বাজেটের সাথে মিলিয়ে দেখব।
