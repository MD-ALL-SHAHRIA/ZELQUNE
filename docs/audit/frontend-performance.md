# Storefront and dashboard performance pass (2026-11-06)

## Update 2026-11-19

Measured with Playwright on the production build (phone: 390 px, 4x CPU slowdown, 1.6 Mbps,
150 ms latency; desktop: unthrottled).

| Change | Before | After |
|---|---|---|
| Photos through Next's optimizer (AVIF/WebP, right width, cached 30 days) instead of a custom loader that sent uploads at full size | Home photos 525 KB phone / 983 KB desktop; product 127 KB | **221 KB / 408 KB; 49 KB** |
| Design/construction film: the `<video>` no longer buffers (`preload="metadata"`) while `fetch` loads the film into memory | Desktop design page 35 MB (the film twice) | **17.3 MB** (once) |
| `Cache-Control` for `public/` (images, videos, fonts, email) | `max-age=0` (a round trip per file on every visit) | a week, then refreshed in the background |

Phone timings after: first paint and LCP 0.9–1.3 s, CLS 0–0.06. The home page's ~350 ms of
blocking time on a 4x slower CPU is almost all React, Next's router and the module runtime
starting up; the site's own code is about 50 ms of it.

The biggest remaining step is on the server side: Cloudflare in front of the VPS (free, with an
edge in Dhaka) caches pages for 60 s and photos for longer, so visitors in Bangladesh do not
wait for a round trip to the data centre (`docs/deploy.md` §2).


Lighthouse 12.8.2, production build (`next build && next start`) on localhost, default mobile
(simulated slow 4G, 4x CPU) and desktop presets. Warm server, median of 2–3 runs.

## Before / after

| Page | Before (mobile) | After (mobile) | After (desktop) |
|---|---|---|---|
| Home `/en` | Perf 48 (cold) – 93 (warm), A11y 93, BP 100, SEO 100. With real throttling: LCP **12.2 s** | Perf 88–92, **A11y 100**, BP 100, SEO 100. Observed LCP 171 ms | **99 / 100 / 100 / 100**, LCP 0.9 s |
| Shop `/en/shop` | Perf 87, A11y 100 | Perf 87, A11y 100 | 99 / 100 / 100 / 100 |
| Product page | Perf 90, **A11y 97** | Perf 90, **A11y 100** | 100 / 100 / 100 / 100 |

| Bundle | Before | After |
|---|---|---|
| Storefront, all static JS+CSS | 1185.5 KB raw / 366.5 KB gz (42 files) | 1186.9 KB raw / 367.2 KB gz |
| Home, JS loaded on first visit | 235 KB | **220 KB** (cookie-settings Radix dialog now loads on open) |
| Dashboard, all static JS+CSS | 1211.5 KB raw / 373.9 KB gz | unchanged (headers only) |

The 38 KB gz chunk shared by both apps is `noModule` polyfills: modern browsers never download it.

## What was wrong and what changed
1. **Hero LCP at 12 s (real throttling).** The carousel moved to slide 2 after about 7.6 s, and
   its full-screen photo became a new, later Largest Contentful Paint. Visitors who don't touch the
   page report it the same way in Google's field data. Autoplay now starts at the first scroll, tap,
   click or key. Those inputs also end LCP measurement.
2. **Hero photo painted only after its reveal (render delay 2.5 s).** The `clip-path` reveal kept
   the photo at zero area until 2.2 s. It is now four espresso bars that slide away (transform, on
   the GPU). The photo paints at first paint and the look is the same.
3. **Accessibility.** `aria-label` on a `<p>` (now an sr-only text). Slide counter contrast
   4.26:1 → `ivory/70`. Small text on the product page's cream boxes 4.03:1 → `ink/80`.
4. **Cookie banner** imported Radix Dialog on every page. The settings dialog is now its own
   chunk, loaded on first open.
5. **Shop/category:** the first row of product photos is preloaded (it is the LCP image).

## Checked, no change needed
- Dependencies are lean: React, Next, Redux Toolkit, Radix Dialog, lucide, clsx, tailwind-merge,
  zod. No duplicates. zod does not ship to the browser.
- `"use client"`: 56 of 130 components, each using state, effects, events or browser APIs. The 3
  without hooks need it anyway (`useParams`, browser session).
- Fonts: variable files, `display: swap`. The italic is not preloaded. Bangla faces load only on
  `/bn` (unicode-range), and Tiro Bangla after load.
- Images: next/image with AVIF/WebP, `sizes` set, and the hero preloaded with
  `fetchpriority=high`. No unused files in `public/`.
- Blocking time is 20–60 ms (the first cold run showed 4.3 s once).

## Why mobile is about 90 and not 100
Lighthouse's mobile score models a slow 4G phone. Before the first paint, every page needs HTML,
27 KB CSS, two fonts and about 220 KB of React/Next JS. On that link this alone puts simulated LCP
at about 3–4 s, even though the real browser paints the hero in under 0.2 s here. Reaching 100
would mean removing React from the first load (an islands architecture). Smaller steps that help:
1. A CDN (Cloudflare, free) with HTTP/3 and edge caching in front of the VPS, to cut TTFB (455 ms
   in the simulation).
2. Self-hosted product photos at the right sizes, served through R2 or the CDN.
3. Fewer client components above the fold.

**Videos:** `public/videos` holds 146 MB. The construction and design pages download the full film
(20 MB on phones, 43 MB on desktop) for smooth scroll scrubbing. Re-encoding saves only about
15%, because scrubbing needs a keyframe every 0.4 s. A better route is to load the film only when
the section comes into view, or to use frame sprites. That is a design decision for the owner.
