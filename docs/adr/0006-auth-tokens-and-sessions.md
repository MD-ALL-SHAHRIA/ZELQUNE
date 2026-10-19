# 0006. Admin auth: ES256 access tokens, rotating refresh tokens, SameSite=Strict cookie

- Status: Accepted
- Date: 2026-10-19

## Context
The dashboard needs staff/owner sign-in (step 1.1); customers get phone OTP in M2. identity-service
issues credentials and the gateway is the only public entry point. Stolen tokens and CSRF are the
main risks for an admin panel that can change prices and verify payments.

## Decision
- **Passwords:** argon2id (m=19 MiB, t=2, p=1, OWASP), rehash on login when parameters change,
  dummy-hash verification for unknown phones so timing does not reveal accounts. Only OWNER/STAFF
  can sign in with a password; the same `INVALID_CREDENTIALS` error for every failure.
- **Access token:** JWT **ES256**, 15 minutes, claims `sub, role, typ=access, jti, iss, aud`.
  identity-service holds the private key; the gateway verifies locally with the **public key only**,
  so the gateway (or any future verifier) can never mint tokens. Returned in the JSON body; the
  dashboard keeps it in memory.
- **Refresh token:** 256-bit opaque value, 30 days, stored only as SHA-256. Every refresh
  **rotates** it (old row revoked, linked to its successor, same `familyId`). Presenting an
  already-rotated token is treated as theft: the whole family is revoked (`REUSE_DETECTED`) and the
  user must sign in again. Logout revokes the family.
- **Cookie:** `zq_rt`, `HttpOnly; Secure; SameSite=Strict; Path=/v1/admin/auth`, optional
  `COOKIE_DOMAIN`. Refresh/logout additionally reject an `Origin` outside `CORS_ORIGINS`.
- **Brute force:** per-IP throttle on login (5 per 15 min) in Redis, plus a per-phone lock that
  counts **failed** attempts only (5 → locked 15 min) and is **reset by a successful login**.
- **Authorization:** default-deny global `JwtAuthGuard` (`@Public()` to opt out) and
  `@Roles('OWNER','STAFF')`.

### SameSite=Strict requires the dashboard and API on the same site
A `SameSite=Strict` cookie is only sent when the request comes from the **same site**
(same registrable domain). In production the dashboard and the API must therefore be subdomains
of one domain, e.g. **`admin.<domain>`** and **`api.<domain>`**, with `COOKIE_DOMAIN` unset
(host-only on `api.<domain>`) or set to `.<domain>`.

A dashboard served from **`*.vercel.app`** (or any other domain than the API's) is cross-site, so
the browser would **never send the refresh cookie** and every refresh would fail. When the dashboard
is deployed (step 1.5/1.6) it needs a custom domain on the same site as the API. Relaxing to
`SameSite=None` is not an acceptable workaround for an admin panel (it re-opens CSRF).

## Consequences
- Revocation takes effect at the next refresh; an access token stays valid for up to 15 minutes.
- Two tabs refreshing at the same moment can trigger reuse detection and sign the user out; the
  dashboard must single-flight refreshes (step 1.5).
- An attacker who knows the owner's phone can still lock it for 15 minutes with 5 wrong
  passwords (the per-IP limit slows this, it does not prevent it from many IPs). Revisit with
  per-(phone, IP) counters or step-up verification if it becomes a problem.
- Key rotation: publish the new public key to the gateway before switching identity's private key
  (a `kid` header and multi-key verification can be added when needed).
