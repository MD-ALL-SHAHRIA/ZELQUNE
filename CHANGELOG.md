# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added
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
