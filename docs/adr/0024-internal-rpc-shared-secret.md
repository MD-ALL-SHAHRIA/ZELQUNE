# 0024: Shared secret on internal TCP calls

Date: 2026-11-06. Status: accepted.

## Context
Services trust `meta.actor` and serve every TCP pattern to any caller; only the private network
kept outsiders away (audit ARCH-001). One misconfigured port or a compromised container on the
network would be enough to call any service as any admin.

## Decision
- One `INTERNAL_RPC_SECRET` (32+ characters) shared by the gateway and all services.
- `ServiceClient` (gateway, order-service saga) sends it as `meta.secret` on every call.
- `RpcContextInterceptor` rejects a call without the right secret (constant-time compare) with
  `401 INTERNAL_AUTH_FAILED`, before any handler runs. The secret is never logged.
- Required when `NODE_ENV=production` (boot fails without it); outside production it is enforced
  whenever set. `pnpm keys:dev` generates it into `infra/.env`; docker-compose refuses to start
  without it. The integration stack sets it, so those tests run through the check.
- The private network stays the first line of defence. mTLS is the upgrade path if services
  ever run on hosts we do not control.

## Consequences
Rotating the secret means restarting every app with the new value at once (brief 401s otherwise).
