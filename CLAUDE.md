# Zelqune monorepo

E-commerce platform for handcrafted wood and light home decor (Bangladesh). Scope and milestones:
docs/website-build-plan.md. Architecture: docs/architecture.md. Decisions: docs/adr/.

## Layout
- backend/      NestJS microservices (Nest monorepo): gateway + 8 services, libs/common, libs/contracts. Rules: backend/CLAUDE.md
- frontend/     Next.js storefront. Rules: frontend/CLAUDE.md
- dashboard/    Next.js admin. Rules: dashboard/CLAUDE.md
- packages/     api-client (generated from gateway OpenAPI), ui-tokens (brand tokens)
- infra/        dev docker-compose, Dockerfiles, Postgres init
- pnpm workspaces + Turborepo; Node 20 (.nvmrc), pnpm 9.

## Commands (repo root)
- `pnpm install` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` (turbo, all packages)
- `pnpm --filter @zelqune/<pkg> <script>` for one package
- `pnpm infra:up` / `pnpm infra:down` / `pnpm health` (dev stack, localhost-only ports)
- `pnpm gen:api` after any gateway API change (commit openapi.json + schema.d.ts in the same PR)

## Git workflow (always follow)
- Never commit directly to main.
- One branch per task: feat/<area>-<short-desc>, fix/..., chore/..., docs/... (area = backend, frontend, dashboard, infra, repo).
- Small Conventional Commits, e.g. feat(backend): ..., chore(infra): .... Commit after each working step.
- When a task is done and lint, typecheck and test pass: `git push -u origin <branch>`, then open a PR to main with `gh pr create` using the PR template (what changed, how it was tested, screenshots if UI). If gh is missing or not authenticated, tell me and give me the compare link.
- Never merge PRs, never force-push main, never rewrite pushed history. I review and merge.
- Never commit .env or secrets; keep .env.example files updated.
- Record significant architecture choices as short ADRs in docs/adr/ (0001-monorepo.md, 0002-microservices-and-messaging.md, ...).

## Working rules
- Start each step in plan mode; one service or one step per session (docs/website-build-plan.md section 6).
- No paid services, sign-ups or deploys without the owner's explicit approval.
- Update CHANGELOG.md (Unreleased) and docs when behaviour or architecture changes.
