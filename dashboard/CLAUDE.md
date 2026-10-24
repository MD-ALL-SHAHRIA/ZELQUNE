# Zelqune dashboard (admin)
Next.js App Router, TypeScript strict, Tailwind 4 (no component library yet: src/components/ui.tsx). Brand tokens from @zelqune/ui-tokens (day theme: espresso #3B2922 on soft cream #F7F1E8, brass #7A5C30); Cormorant Garamond + Jost.
Talks ONLY to the backend gateway (NEXT_PUBLIC_API_URL). API types generated from gateway OpenAPI with
openapi-typescript (`pnpm gen:api`); never hand-write API types.
- Dashboard: auth via httpOnly cookies, role-aware UI (OWNER/STAFF), TanStack Table for lists.
- Never invent reviews, ratings, sold counts, scarcity or fake countdowns.
- Playwright tests for critical flows. Before finishing: lint, typecheck, test.
- Monorepo: API types from `@zelqune/api-client` (packages/api-client), brand tokens from `@zelqune/ui-tokens`; docs in ../docs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
