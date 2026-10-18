# Contributing

Thanks for helping build Zelqune. This repository is proprietary (see [LICENSE](LICENSE)); you need
the owner's permission to contribute.

## Setup

Prerequisites: Node 20 (`nvm use`), pnpm 9 (`corepack enable`), Docker Desktop.

```sh
pnpm install          # installs all workspaces, generates Prisma clients
pnpm infra:up         # Postgres, RabbitMQ, Redis + all backend apps (localhost only)
pnpm health           # every /health should be 200
pnpm lint && pnpm typecheck && pnpm test
```

## Branches

Never commit to `main`. One branch per task:

| Prefix | Use |
|---|---|
| `feat/<area>-<short-desc>` | new behaviour |
| `fix/<area>-<short-desc>` | bug fix |
| `chore/<area>-<short-desc>` | tooling, deps, refactors without behaviour change |
| `docs/<area>-<short-desc>` | documentation only |

`area` is one of `backend`, `frontend`, `dashboard`, `infra`, `repo`.
Example: `feat/backend-identity-otp`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), small and focused, one per working step:

```
feat(backend): add phone normalization for +8801 numbers
fix(frontend): keep price experiment cookie on refresh
chore(infra): pin postgres image
docs(repo): add ADR 0006 for courier providers
```

## Pull requests

1. `pnpm lint`, `pnpm typecheck` and `pnpm test` pass locally.
2. `git push -u origin <branch>` and open a PR to `main` with `gh pr create`; fill in the template
   (summary, changes, how tested, screenshots for UI).
3. CI must be green. The owner reviews and merges (squash). Never force-push `main` or rewrite
   pushed history.

## Rules that reviews check

- TypeScript strict, no `any`. Money is integer paisa.
- Services never read another service's schema; share data via RPC or events (outbox).
- Order/payment creation requires `Idempotency-Key`.
- No secrets or `.env` files in Git; keep `.env.example` current.
- Significant architecture decisions get a short ADR in [docs/adr/](docs/adr/README.md).
- Update `CHANGELOG.md` under **Unreleased**.
- Storefront: never invent reviews, ratings, sold counts, scarcity or countdowns.
