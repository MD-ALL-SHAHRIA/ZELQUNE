# identity-service audit

## Scope
Read every non-generated file in `backend/apps/identity-service` (main, app.module, config, auth/*, team/*, users/*, seed/*, prisma schema + 3 migrations, .env.example, specs). To trace callers and trust boundaries I also read the gateway side: `apps/gateway/src/auth/admin-auth.controller.ts`, `auth/refresh-cookie.ts`, `auth/login-attempts.service.ts`, `customer-auth/customer-auth.controller.ts`, `customer-auth/oauth.service.ts` (Facebook part), `admin/admin-settings.controller.ts`, plus the contracts (`libs/contracts/src/auth/auth.contracts.ts`, `settings/settings.contracts.ts`) and ADRs 0006, 0010, 0020 and 0021.

Checked and OK:
- argon2id m=19456 t=2 p=1 (OWASP). Rehash on login when `needsRehash`. Dummy-hash verify for unknown users, so login timing is even. Malformed hashes fail closed.
- JWT is ES256 from a PKCS#8 key loaded at init. Claims are sub, role, typ=access, jti, iss, aud, exp. TTL is bounded by zod (60..3600 s). The gateway pins `algorithms: ['ES256']`. A missing `kid` is documented in ADR 0006.
- Refresh tokens are 256-bit random values stored only as SHA-256. Rotation runs in one transaction. A conditional `markRotated` covers the concurrent-rotation race. Reuse of a revoked token revokes the whole family, and that revocation commits even though the request fails. Expired or wrong-role tokens revoke their family. Logout is idempotent.
- Email links (verify 24 h, reset 30 min) are 256-bit `randomBytes` stored only as SHA-256. Lookup is by hash, so no timing-unsafe compare is needed. Use is single (conditional `updateMany usedAt:null`), and a new link voids older ones. Reset ends all sessions and verifies the email.
- Enumeration: register, resend and forgot return identical answers. Customer login returns the same error for a wrong password, a wrong role or an inactive account. EMAIL_NOT_VERIFIED only shows after a correct password.
- Brute force: the gateway locks per phone/email (`LoginAttemptsService`), throttles per IP, and puts Turnstile on register and forgot.
- Team: all team routes are `@Roles('OWNER')` in the gateway. STAFF cannot reach create, update or resetPassword. Self-demotion and self-deactivation are blocked. The last active owner is protected. Role or access changes and password resets end sessions. Audit is written through the outbox in the same transaction.
- RPC responses: `toAuthUser`, `view`, `me` and `CustomerAccount` never include passwordHash, token hashes or sessions.
- Seed has no default password. It requires OWNER_PHONE and a password of at least 12 characters, and logs a masked phone.
- Customer accounts list: zod-validated, paginated (max 100), q at most 80 characters, Prisma `contains` (parameterised). byIds is uuid-validated with max 200.
- OAuth: an unverified pre-registered account loses its password and sessions when it is linked. Admin accounts never link.
- No raw SQL. No outbound HTTP from this service.

## Service map
- **Responsibility:** admin (OWNER/STAFF) and customer identities, passwords, sessions (refresh-token families), email-link tokens, OAuth links, team management, customer account listing.
- **Entry:** `src/main.ts` calls `bootstrapService(AppModule, 'identity-service', { commands: { seed: seedOwner } })`. Ports from .env.example: HTTP 3001 (health), TCP 4001.
- **DB:** Postgres schema `identity`, with tables users, refresh_tokens, auth_tokens, oauth_accounts, outbox_events and processed_events.
- **TCP patterns served:**
  - `identity.login`, `identity.refresh`, `identity.logout`, `identity.me`
  - `identity.customer.{register, login, refresh, verifyEmail, resendVerification, forgotPassword, resetPassword, oauth, me, updateProfile, changePassword, sessions, revokeSession, revokeOthers}`
  - `identity.accounts.{list, byIds}`
  - `identity.team.{list, create, update, resetPassword, changePassword, updateProfile}`
- **Calls out:** nothing. The gateway sends auth emails by calling notification-service with the `AuthMailResult` that identity returns.
- **Publishes (outbox):** only `audit.recorded`, via `recordAudit` in team.service (create, update, resetPassword, changePassword).
- **Consumes:** nothing (no `subscribe` calls). In particular it does not consume `privacy.erased`.

## Findings

### SEC-1: Squatting a staff member's phone on a customer account gives dashboard access when the owner adds that phone to the team
- Severity: **High** / Confidence: Confirmed (traced identity + gateway) / Effort: S / Needs approval: yes (changes the team-create auth flow)
- Location: `backend/apps/identity-service/src/team/team.service.ts:51-67`, `src/auth/auth.service.ts:77-86`, `src/auth/customer.service.ts:270-273` and `392-414`, `backend/apps/gateway/src/auth/admin-auth.controller.ts:82-92`
- Code:
```ts
// team.service.ts:51-67
const existing = await tx.user.findUnique({ where: { phone: input.phone } });
if (existing && existing.role !== 'CUSTOMER') throw new AppError('TEAM_MEMBER_EXISTS', ...);
const data = { name: input.name, email: input.email || null, role: input.role, passwordHash, isActive: true };
const row = existing
  ? await tx.user.update({ where: { id: existing.id }, data })   // customer row promoted; sessions & links kept
  : await tx.user.create({ data: { phone: input.phone, ...data } });
```
```ts
// auth.service.ts:77-78 (admin refresh, roles = ADMIN_ROLES)
const { user } = current;
if (current.expiresAt <= now || !user.isActive || !roles.includes(user.role)) {
```
```ts
// customer.service.ts:273 — customer can set any unused phone, no verification
await this.prisma.user.update({ where: { id: userId, role: 'CUSTOMER' }, data: input });
```
- Problem and impact: customer phones are never verified. A customer can register with any phone, or change it later with `PUT /v1/auth/me`. When the owner adds a team member whose phone is already on a CUSTOMER row, `team.create` promotes that row to STAFF or OWNER in place. It does not revoke the row's refresh tokens or void its outstanding auth_tokens. Three attacks follow from that:
  - The attacker can send their customer refresh token (a plain unsigned cookie value) to `POST /v1/admin/auth/refresh` with the admin cookie name and no Origin header. The refresh succeeds, because the family's user now has role STAFF or OWNER, and returns a dashboard access token.
  - A pending RESET_PASSWORD link (`consume` does not check the role) lets the attacker set the new staff member's password.
  - A pending VERIFY_EMAIL link opens a session.

  The attacker only needs to know or guess the future staff member's phone number. With role OWNER this is full store takeover. The seed command has the same promotion path: `upsertAdmin` upserts by phone and keeps the existing sessions (`user.repository.ts:42-47`).
- Fix:
  - In `team.create`, when `existing` is a CUSTOMER, refuse with 409. Ask the owner to use a different phone or have the customer remove it. At minimum, in the same transaction: revoke all refresh tokens, mark all auth_tokens used and delete oauth_accounts.
  - In `consume`, require `row.user.role === 'CUSTOMER'`.
  - In `seedOwner`, refuse when the existing row is a CUSTOMER, or revoke its sessions.

### SEC-2: Pre-registration takeover of an email/password customer account
- Severity: **High** / Confidence: Confirmed / Effort: M / Needs approval: yes (changes the verify-email flow)
- Location: `backend/apps/identity-service/src/auth/customer.service.ts:59-63`, `114-120`
- Code:
```ts
const byEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
if (byEmail) {
  if (byEmail.role === 'CUSTOMER' && !byEmail.emailVerifiedAt) {
    // An unfinished sign-up: resend the link, never overwrite the stored password.
    return { mail: await this.verifyMail(byEmail, lang) };
```
```ts
async verifyEmail(raw: unknown, meta: SessionMeta): Promise<SessionTokens> {
  const { token } = tokenOnlySchema.parse(raw);
  const user = await this.consume(token, 'VERIFY_EMAIL', async (tx, u) => {
    await tx.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
```
- Problem and impact: an attacker registers `victim@mail` with the attacker's own password and phone. When the real owner later signs up, the code resends a link and discards the owner's password. The owner clicks the link and is signed in, which marks the account verified. The stored password is still the attacker's, so the attacker can sign in at any time and read the victim's orders, addresses and quotes. The victim's own password never worked, but the victim may not notice because they are already signed in. ADR 0021 applies the pre-registration defence only to the OAuth path. The attacker's phone also stays on the account, which feeds SEC-1.
- Fix: verifying must not leave a password set by someone else in place. Two options:
  - (a) Have the verify page ask for the password and check it before setting `emailVerifiedAt`. On a mismatch, refuse and offer "set a password", which is the reset flow.
  - (b) Store the registrant's `passwordHash` (and name and phone) on the VERIFY_EMAIL auth_tokens row as a new nullable column. Apply them on verify, and don't put the password on `users` until the email is verified.

  Option (a) is the simpler one.

### SEC-3: Admin passwords skip the common-password policy; `MIN_ADMIN_PASSWORD_LENGTH` is only used by seed
- Severity: Medium / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/libs/contracts/src/settings/settings.contracts.ts:83-87`, `backend/apps/identity-service/src/team/team.service.ts:45-48`, `128-130`, `147-152`, `src/auth/password.service.ts:12`
- Code:
```ts
const passwordSchema = z.string().min(10, 'At least 10 characters').max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), 'Use letters and numbers');
```
```ts
export const MIN_ADMIN_PASSWORD_LENGTH = 12;   // only referenced in seed/owner.seed.ts
```
- Problem and impact: customer passwords go through `assertStrongPassword`, which rejects common passwords and the person's own details. Dashboard passwords, which carry the highest privilege, do not. `password123`, `zelqune2026` and `admin12345` are all accepted for STAFF and OWNER through team create, reset and change. The 12-character admin minimum that the seed enforces is not applied anywhere else. Admin `changePassword` (`team.service.ts:147-162`) also leaves other sessions alive, unlike the customer flow, so a session stolen before the change survives it.
- Fix: call `assertStrongPassword(pw, [name, email, phone])` in team create, resetPassword and changePassword. Raise the minimum to `MIN_ADMIN_PASSWORD_LENGTH`. In `changePassword`, revoke the user's other refresh-token families (the gateway can pass the current refresh cookie, as the customer route does).

### SEC-4: Customer accounts are outside the privacy-erasure flow (ADR 0020 not updated for ADR 0021)
- Severity: Medium (compliance) / Confidence: Confirmed / Effort: M / Needs approval: yes (new event consumer and erase semantics)
- Location: `backend/apps/identity-service/src/` (no `subscribe` calls), `docs/adr/0020-privacy-requests.md:6-7`, `31-33`
- Code:
```text
0020: "There are no customer accounts: customers are known by their phone number..."
0020: "the `privacy.erased` event makes payment-service clear the payer phone ..., notification-service delete their contacts ..."
```
- Problem and impact: since ADR 0021, identity holds each customer's name, email, phone, IP and user-agent (in refresh_tokens) and OAuth emails. A privacy erase never touches any of it. Identity does not consume `privacy.erased`, and there is no "delete my account" route (the gateway's customer-auth exposes no DELETE for the account). The policy's deletion promise is therefore not met for account holders.
- Fix:
  - Subscribe to `privacy.erased` in identity, keyed by phone. Anonymise the CUSTOMER row (email, name and phone replaced with tombstones, `isActive=false`, `passwordHash=null`), delete oauth_accounts, auth_tokens and refresh_tokens, and do it idempotently.
  - Add a self-service account deletion route later.
  - Amend ADR 0020.

### DB-1: refresh_tokens, auth_tokens and unverified users are never pruned
- Severity: Low / Confidence: Confirmed (no deleteMany or scheduled job in the service) / Effort: S / Needs approval: no
- Location: `backend/apps/identity-service/src/auth/auth.service.ts:123-134` (a new row on every refresh), `src/auth/customer.service.ts:320-324`
- Code:
```ts
const firsts = await this.prisma.refreshToken.groupBy({
  by: ['familyId'],
  where: { familyId: { in: [...new Set(rows.map((r) => r.familyId))] } },
  _min: { createdAt: true },
});
```
- Problem and impact: with 15-minute access tokens, an active session inserts about 4 rows an hour, kept forever along with their IP and user-agent (PII retention). The `sessions` groupBy scans every historic row of each family. Unverified CUSTOMER rows also hold a unique phone forever. That blocks the real owner of the number (`phoneTaken`) and makes the squatting in SEC-1 permanent.
- Fix: add a daily cleanup in the service:
  - delete refresh_tokens where `expiresAt < now() - 7d` or `revokedAt < now() - 30d`
  - delete auth_tokens where `expiresAt < now() - 1d`
  - delete CUSTOMER users with `emailVerifiedAt IS NULL AND createdAt < now() - 7d`

### QUAL-1: TCP handlers for admin auth and customer OAuth do not validate `data`
- Severity: Low / Confidence: Confirmed / Effort: S / Needs approval: no
- Location: `backend/apps/identity-service/src/auth/auth.rpc.controller.ts:19-38`, `src/auth/customer.rpc.controller.ts:55-73`
- Code:
```ts
login(@Payload() req: RpcRequest<LoginRpcRequest>) { return this.auth.login(req.data); }
...
return this.customers.oauth(profile as OAuthProfile, meta);
```
- Problem and impact: login, refresh, logout, me, customer me and sessions, the OAuth `profile` and `pending` use plain TS casts, whereas the other handlers use zod. Any TCP peer (the brief notes TCP has no auth) can submit an arbitrary `OAuthProfile` with `emailVerified: true`. That signs in as, or links to, any CUSTOMER by email. A malformed `userId` or `phone` turns into a Prisma error and a 500 instead of a 400. The impact relies on network isolation, so this is defence in depth.
- Fix: parse with `adminLoginRequestSchema`, `z.object({ refreshToken: z.string().max(256) })`, `z.uuid()` for userId, and zod schemas for `OAuthProfile` and `PendingSignup` from libs/contracts.

### QUAL-2: Concurrent demotions can leave zero active owners
- Severity: Low / Confidence: Likely (READ COMMITTED default) / Effort: S / Needs approval: no
- Location: `backend/apps/identity-service/src/team/team.service.ts:98-102`
- Code:
```ts
if (before.role === 'OWNER' && (demoted || deactivated)) {
  const owners = await tx.user.count({ where: { role: 'OWNER', isActive: true } });
  if (owners <= 1) throw new AppError('LAST_OWNER', ...);
```
- Problem and impact: two owners demoting or deactivating each other at the same moment both see count 2, and both commit. The store is then left with no owner, and recovery needs the seed command.
- Fix: lock the owner rows first (`SELECT ... FROM users WHERE role='OWNER' AND is_active FOR UPDATE` via `$queryRaw`), or run the transaction with `isolationLevel: Serializable`.

### QUAL-3: CustomerService (register, verify, reset, OAuth link, sessions) has no tests
- Severity: Low / Confidence: Confirmed (no spec references CustomerService anywhere in backend) / Effort: M / Needs approval: no
- Location: `backend/apps/identity-service/src/auth/customer.service.ts` (416 lines). The specs present are auth.service, password, password-policy and team.service.
- Problem and impact: the account-security paths in SEC-1 and SEC-2 (single-use links, unverified-account handling, OAuth pre-registration defence, revokeOthers) have no regression tests.
- Fix: add unit tests with an in-memory Prisma fake, as auth.service.spec does. Cover link reuse, expired link, a new link voiding old ones, reset revoking sessions, OAuth unverified-account takeover defence, and the fixes for SEC-1 and SEC-2.

Summary: 0 Critical, 2 High, 2 Medium, 4 Low.
Top 3: SEC-1 (a customer row squatting a staff phone is promoted in place and keeps its sessions and links, so the attacker gets dashboard access through the admin refresh), SEC-2 (email pre-registration leaves the attacker's password on the victim's verified account), SEC-3 (admin passwords skip the common-password check and the 12-character minimum).
