# Zelqune dashboard (admin)
Next.js App Router, TypeScript strict, Tailwind + shadcn/ui. Brand tokens: walnut #4A3426, cream #F4ECDF, amber #E3A857.
Talks ONLY to the backend gateway (NEXT_PUBLIC_API_URL). API types generated from gateway OpenAPI with
openapi-typescript (`pnpm gen:api`); never hand-write API types.
- Dashboard: auth via httpOnly cookies, role-aware UI (OWNER/STAFF), TanStack Table for lists.
- Never invent reviews, ratings, sold counts, scarcity or fake countdowns.
- Playwright tests for critical flows. Before finishing: lint, typecheck, test.
- Monorepo: API types from `@zelqune/api-client` (packages/api-client), brand tokens from `@zelqune/ui-tokens`; docs in ../docs.
