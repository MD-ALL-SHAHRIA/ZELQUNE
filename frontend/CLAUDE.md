# Zelqune frontend (storefront)
Next.js App Router, TypeScript strict, Tailwind + shadcn/ui. Brand tokens (v4, dark): ivory #F3ECE1 on espresso #14110F, champagne brass #C9A46A, glow #F2C58A; Bodoni Moda + Jost.
Talks ONLY to the backend gateway (NEXT_PUBLIC_API_URL). API types generated from gateway OpenAPI with
openapi-typescript (`pnpm gen:api`); never hand-write API types.
- Storefront: English default + Bangla (/en and /bn routes; the URL decides the language), mobile-first, SSG/ISR, next/image, Lighthouse mobile >= 90, minimal client JS.
- All copy comes from ../docs/copy-en.md and ../docs/copy-bn.md; `[[...]]` items stay visible placeholders.
- Never invent reviews, ratings, sold counts, scarcity or fake countdowns. Never say "in stock" for a PRE_ORDER product.
- Structure (ADR 0013): `app/` routes only; `features/<domain>/`; `shared/ui` (design system),
  `shared/lib`, `shared/api` (server data); `store/` (Redux Toolkit); `config/env.ts`; `content/`.
- Server Components fetch catalog data (ISR). Browser calls go through RTK Query endpoints
  generated from the gateway spec (`pnpm gen:store`); never edit `store/api/generated.ts`.
- Side effects (analytics, Pixel, cookies) live in store listeners; components dispatch events.
- Design: tokens from `@zelqune/ui-tokens`; display serif + sans; arch is the one curved motif;
  Bangla text never letter-spaced or uppercased. Mobile pages must not scroll sideways.
- Playwright tests for critical flows. Before finishing: lint, typecheck, test.
- Monorepo: API types from `@zelqune/api-client` (packages/api-client), brand tokens from `@zelqune/ui-tokens`; docs in ../docs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
