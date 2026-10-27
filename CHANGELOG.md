# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Fixed
- Construction film is sharp: full HD (1920×1080) for larger screens and a separate 720p cut for phones, re-encoded from the 1080p–4K sources at much higher quality with a light denoise (was 720p at heavy compression, soft and grainy when stretched full screen). Each screen downloads only its own file; a replaced download is cancelled; the in-memory copy now loads after React's dev double-mount too.

### Changed
- Construction film: 56 s, eleven licensed Pexels shots across the seven chapters (architect drafting, concrete pour, frame, rising structure, wood-clad and pool houses, two interiors, dusk aerial), in two grades: bright and clean for day mode, warm and moody for night mode (switches with the theme, same frame). More reliable scrubbing: plays from the stream at once and swaps to the in-memory copy at the same frame; one seek at a time; redraws when ready; iPhone warm-up on first touch.
- Construction page: a brass roadmap thread runs from the film through the following sections (down one edge, across on a diagonal, down the other) and draws with the scroll, a glowing point at its tip; "Why one team" is a small point-and-line roadmap.

### Changed
- Construction journey now plays a real film: licensed Pexels footage (dusk aerial of a modern house, concrete frame, a building rising, the finished house, two finished interiors) cut, graded warm and timed to the six stage chapters; the scroll scrubs it both ways (frontend/public/videos, credits in CREDITS.md). CSP allows `media-src blob:` for smooth seeking.

### Changed
- Construction page opens with a scroll-driven journey of one building (after the owner's reference): land at dusk with survey pegs → the plan draws itself → dimensions and an approval seal → slab, columns and floors rise → glass, wood-slat facade, stone wall and garden → windows light up → the camera flies into a lit window and lands in a room with the Fluted Niche Panel. Six stage chapters rise and fade over it with a stage chip and progress rail; progress eases toward the scroll (no scroll hijack). A fly-through video can replace the drawing and is then scrubbed by the scroll. Reduced motion gets the chapters stacked. Bangla uses Bangla digits and no letter-spacing.

### Changed
- Hero slide 1 polish: "Light" in the logo's italic, warm brass with a soft glow; lamplight halo from the lit panel onto the dark wall, fine grain and a soft vignette (all still); brass hairline mount inside the tall photo; brass rules over the top line and caption; N° 01 / 02 on the piece cards. Slide 3 uses a warmer dusk photo of a modern home.

### Fixed
- Storefront (dev console): "Transition was aborted because of invalid state. Document hidden". A page change in a hidden tab now updates without the fade instead of failing the View Transition; this also removes the follow-on "Encountered a script tag" warning, which came from React re-rendering the page to recover from that error. The theme script still runs before first paint (no flash in night mode).

### Changed
- Home hero is now four slides: our panels (giant "Wood · Light" split around a tall lit panel; a loader first, then the photo opens out, then the cards and line), interior design, construction and bulk orders (full-bleed premium photo, very large headline, text and buttons). Letters rise one by one (Bangla word by word); compact controls at the foot; 7 s per slide, paused on hover, focus, a hidden tab and for reduced motion. Slide words are editable in Content → Pages and policies → Home hero.

### Fixed
- Day theme: alternate sections and cards now stand apart from the page (cream #f2eadf → #ece0ce, sand #efe6d8 → #e9dcc8, borders #e4d8c6 → #d9cab3; section bands use solid cream). Secondary text darkened (#75604f → #69543f) so it keeps ≥ 4.5:1 contrast on every surface.
- Uploaded photos (dev storage) are served with a one-year immutable cache (keys never change), so the hero photo is not downloaded again on every visit.

### Changed
- Home hero: the headline rises in word by word (masked, once, off for reduced motion); trust-strip icons draw their strokes as they scroll into view (CSS scroll-driven). A WebGL light layer and mouse parallax were tried and dropped: they washed out the photo's colours.

### Performance
- Gateway: public catalog, sale and home-content responses cached in Redis for 30 s with CDN-ready `Cache-Control` (ADR 0018).
- Quotes list: order codes fetched in one query instead of one per converted quote (N+1).
- Storefront: the sale countdown reserves its space before the clock starts (layout shift 0.11 → 0 on every page).
- Removed unused dependencies (dashboard: zod, openapi-fetch; storefront: openapi-fetch).

### Changed
- Dashboard: the content editor is now called "Website content" (it holds the home page, projects, clients and page texts); ⌘K finds it by "projects", "clients", "privacy" and more.

### Added
- Content → Projects: interior design and construction projects (title, place, note, up to 6 photos, EN/BN) shown on the Interior design and Construction pages instead of "coming soon".
- Content → Clients: company logos (name, logo, optional website) drifting across the home page under the statement band; hidden until the first client is added.

### Fixed
- Quotes: interior design and construction requests can be accepted ("Take on this project") straight from New; before, only Decline was possible because these requests are never priced.

### Added
- Content → Pages and policies: the owner edits 24 storefront texts (story, privacy, terms, FAQ answers, making time, refund days, materials, workshop, design fee, warranty, footer contact) in English and Bangla; empty keeps the built-in copy. Stored as `texts` in the home content (only listed paths are applied).

### Changed
- Copy: every `[[…]]` placeholder replaced with draft wording for the owner to review; no invented phone numbers (contact lines point to WhatsApp, whose number is set in Content).
- The product page's making time uses `{days}` (the product's lead time, 10 days by default).

### Added
- Dashboard: the sidebar panel button now collapses the sidebar to icons (names as tooltips, a dot for waiting orders and quotes); remembered per browser.

### Added
- Dashboard: "New product" button on Products; creates a draft and opens it for finishes, prices and photos.

### Changed
- Dashboard: bell, theme and profile sit on their own top row, so page buttons (Export CSV, New product) line up with the page title.

### Added
- Storefront SEO: Organization and WebSite schema on every page, category pages in the sitemap, the brand description as the default meta description (FAQ, terms, returns, privacy had none).

### Changed
- Product page redesigned after a UX audit (docs/ux/product-page-audit.md, following the Apex
  case study method): large two-column gallery; Buy now / Pre-order now plus Add to cart as the
  only primary actions; size beside the finish with "See it on your wall"; compact delivery and
  "Buy with confidence" cards right under the buttons; "Complete the wall" cross-sell with
  one-tap Add; details, timeline, delivery and care as accordions under the gallery; a Share
  action beside the title. Copy added in EN and BN.

### Changed
- Admin dashboard restyled after the owner's Northstar reference: off-white canvas with the
  sidebar and page title on it and each page in one large white panel; two-tone cards (grey
  title strip, white inset); big light numbers with monospace changes beside a circled arrow;
  smooth grey trend lines over a faint grid; the sales funnel as pill segments; tinted monospace
  status chips; lists with letter avatars, dashed separators and small outlined actions; a
  "Search or jump to" pill, monospace section labels and outlined counts in the sidebar; an
  amber-walnut primary button. Home is now "Overview" (chips for payments to check and new
  requests, GO status, payments-to-check list with Verify, Export CSV). Night mode kept.

### Added
- Admin dashboard design pass (after DashStack/BankDash on Figma, Envato admin templates and
  Dribbble): an espresso welcome band on Home (date, today's revenue/orders/to-dos, the GO target
  as a brass progress bar, quick actions), KPI cards with icon chips and trend pills on every
  page, a sales-by-channel donut, best sellers with photos, a pipeline progress bar, a recent
  activity timeline (owner), the revenue line over every day of the range, rounder cards and a
  brass marker on the active menu item.

### Fixed
- Admin pages no longer scroll sideways on phones (grid cards can shrink; screen-reader table
  labels stay inside their scroll box; segmented tabs scroll).

### Changed
- Home hero follows the owner's reference: full-bleed, warm room scenes with one of our pieces
  lit on the wall (the owner's renders widened to 2400×1350 by continuing each photo's own wall
  around it, the piece at about three quarters of the height so it is always seen whole;
  `public/images/hero`, phone cuts `-1200`), cross-fading with a slow drift every 6 s. Set
  entirely in the logo's Cormorant Garamond: "Handcrafted wood and gentle light, made to turn
  every wall of your home into a *quiet story.*", "Explore the collection"; bars and a pause
  button bottom left, a "Now on the wall" caption with price and link plus square arrows bottom
  right; swipe on phones, where the scene sits above the words. Pauses on hover and focus, never
  moves by itself with reduced motion; only the first scene loads up front.
- Hero, cinematic pass: shorter lines at full size ("Handcrafted wood and gentle light, for walls
  that tell a *quiet story.*"); the pieces sit further right (about 76% across);
  a film look over the scenes in both themes (fine grain, vignette, a slow beam of window light,
  a bloom on the lit piece, a hint of letterbox), golden hour by day and dimmed and lamp-lit by
  night; scenes change with a soft focus pull. The film layers arrive after the page has loaded.
- Home, after the owner's reference: a slim trust strip under the hero (Handcrafted · Safe 5V
  light · ৳300 advance · Across Bangladesh, from the copy) and a "Find your perfect piece"
  collections row (title and link left, wide room cards right with round arrows, swipe and snap)
  that replaces "Pieces for every wall". Collections and their piece counts come from the
  catalog, so new categories appear by themselves; empty ones are left out.
- Header: the Interior Design and Construction links show from 1360px wide (they stay in the
  menu), so they never collide with the wordmark.
- Day and night themes: day is the default for everyone (soft cream #F7F1E8 with espresso
  #3B2922 and antique brass; dark bands are espresso coffee, nothing black). Night (Dark Walnut)
  only when the visitor picks it with the sun/moon toggle (header; in the menu on phones); the
  choice is remembered, no flash on load. The wordmark is back in the owner's logo lettering
  (Cormorant Garamond), and the favicon and share images are the originals again.
- Storefront redesign, dark walnut luxury (owner's choice): ivory text on deep espresso with
  champagne-brass details and the warm lamp glow, Cormorant Garamond headings (the owner's original face, set at medium weight) with Jost text, an
  editorial split hero ("Make your walls feel alive.") with the lit moon panel in an arch frame,
  and the owner's own lit-shelf renders as product, category and material photos until real
  photos are uploaded from the dashboard. Share images and the favicon follow the dark palette.
- Home sections each have their own form: gallery-mount featured piece, a materials accordion
  of light, and an ivory marquee band for the brand statement.
- Footer: the oversized wordmark is shown in full (brass), link and copyright text are readable,
  and the statement is no longer repeated there.
- No more "01 / 02 / 03" step numerals anywhere: hairlines and amber dots instead.
- Motion: staggered hero entrance, scroll-linked photo settle, product cards lift with a warm
  glow on hover, drifting marquee (all off with reduced motion; transforms and opacity only).

### Added
- Owner settings and team (ADR 0017): bKash/Nagad receiving numbers (payment-service), the
  pre-order advance (order-service), delivery fees (shipping-service) and the owner alert phone
  (notification-service) are editable at `GET|PUT /v1/admin/settings/{payments,checkout,shipping,notifications}`
  (staff read, owner writes), stored per service in a `settings` table with env values as
  defaults, audited. Team management at `/v1/admin/team` (owner): add members, change role or
  access, reset passwords (sessions revoked; never yourself, never the last owner). Everyone:
  `PUT /v1/admin/account/{profile,password}`. Migrations: `settings` in four services.
- Business operations (ADR 0016):
  - **Flash and seasonal sales** (catalog `Promotion`), applied in price resolution so the
    storefront and checkout charge the sale price; public `GET /v1/catalog/sale`.
  - **Coupon codes** (order-service), checked in the cart quote and at checkout and redeemed in
    the order's own transaction; `couponCode` on quote and checkout, `discountPaisa` in the totals.
  - Unit cost per variant (`costPaisa`) and an **expense ledger** (analytics-service).
  - Reports: `GET /v1/admin/reports/sales`, `GET /v1/admin/customers`, and an OWNER-only
    `GET /v1/admin/reports/profit-loss` that compares against the previous period.
  - Admin CRUD for `/v1/admin/{coupons,promotions,expenses}`, all audited.
  - Migrations: `coupons`, `promotions_costs`, `expenses`.
- Admin dashboard redesign (Polaris/Stripe/Linear patterns): fixed sidebar with a live payment-check
  count, ⌘K search, Geist UI type, day/night themes, toasts, skeletons, unsaved-changes bar;
  Home with date ranges, KPI cards with change and sparklines, revenue chart with tooltip, GO
  ring, order pipeline, funnel and price test; order detail with a primary next step, dialogs and
  a timeline; products with drag-and-drop photos; the home page editor with a live preview.
- Admin dashboard (`dashboard/`, port 3200, step 1.5): sign-in (access token in memory, httpOnly
  refresh cookie), overview (GO counter, funnel, price experiment), orders (TanStack Table list,
  detail with verify/reject advance, confirm COD, state-machine moves, notes, shipment),
  products (details in English and Bangla, publish/archive, photo upload) and a **Home page**
  editor for the storefront content (announcement, hero words and scenes, trust strip,
  collections row, contact and social links; image upload; version check).
- Storefront reads the owner's home content (`GET /v1/content/home`, ISR 60 s): hero scenes and
  words, trust strip icons and texts, collections order and covers, the announcement bar, footer
  contact and social links, and the WhatsApp number; built-in copy wherever a field is empty.
- Local dev storage serves `content/` keys and answers CORS for the dashboard origin
  (`DEV_STORAGE_CORS_ORIGINS`).
- Storefront content (ADR 0015): catalog-service stores the home page content (hero scenes,
  trust strip, collections order, announcement, contact and social links; English + Bangla) as a
  versioned document with uploaded images. Public `GET /v1/content/home`; OWNER/STAFF
  `GET|PUT /v1/admin/content/home` (optimistic concurrency, audited) and content image upload
  (`POST /v1/admin/content/assets/uploads`, `.../:id/confirm`). Migration `site_content`.

### Added
- Premium storefront: "Shop the room" (tap markers on a room photo to see each piece),
  materials and statement sections, a shared "Buy with confidence" trust band, a "Made for you"
  timeline and mobile sticky purchase bar on product pages, "See it on your wall" (place a piece
  on a photo of your own wall; the photo never leaves the device; code-split), per-product
  share cards for Facebook (`opengraph-image`), and an optional "Chat on WhatsApp" button
  (`NEXT_PUBLIC_WHATSAPP_NUMBER`; hidden when empty).
- Services (ADR 0014): Zelqune Interior Design (homes, offices, restaurants and cafés, hotels,
  shops) and Zelqune Construction (ground up to finished interiors). Requests are RFQs of kind
  `DESIGN` / `CONSTRUCTION` with a brief (space/building type, area, district, budget, floors),
  tracked by code + phone, listed for admins by kind, owner alerted by SMS; never priced as
  product quotes.
- Product range in a dev-only demo catalog (`pnpm seed:demo`): Diamond Shelf, Wave Shelf,
  Half-Moon Planter Light, Fluted Niche Panel, Capsule Vase Light; categories Wall panels,
  Shelves, Lighting.

### Changed
- Premium redesign pass: refined type scale, buttons and hover details, condensing header,
  editorial footer, cinematic home hero, RH-catalog listings, design-studio and
  architecture-firm service pages, shared help layout. Bangla display headings use Tiro Bangla
  (OFL, self-hosted), registered after page load so it never delays the first paint.
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
