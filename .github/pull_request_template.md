## Summary
<!-- What does this PR do and why? Link the build-plan step or issue (e.g. "Step 1.1", "Closes #12"). -->

## Changes
<!-- Bullet list of the notable changes, grouped by area (backend, frontend, dashboard, infra, repo). -->
-

## How tested
<!-- Commands run and their results; manual checks with URLs/steps. -->
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] Manual:

## Screenshots
<!-- Required for UI changes (mobile first). Delete if not applicable. -->

## Checklist
- [ ] Branch follows `feat|fix|chore|docs/<area>-<short-desc>`; commits follow Conventional Commits
- [ ] No secrets or `.env` committed; `.env.example` files updated
- [ ] Docs updated (README, CHANGELOG `Unreleased`, ADR for significant decisions)
- [ ] API changes: `pnpm gen:api` run and generated files committed
- [ ] Money in integer paisa; Idempotency-Key on order/payment creation; events via outbox
