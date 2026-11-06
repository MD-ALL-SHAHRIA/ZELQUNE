# notification-service audit

## Scope
Files read: `backend/apps/notification-service/{.env.example, prisma/schema.prisma, prisma/migrations/*, src/main.ts, src/app.module.ts, src/config/notification-env.ts, src/email/*, src/sms/sms.provider.ts, src/notify/*, src/settings/notification-settings.ts, src/prisma/prisma.service.ts}`. I also traced into: `libs/common/src/messaging/event-consumer.ts` + `retry-policy.ts`, `libs/common/src/settings/settings.store.ts`, `libs/common/src/logger/logger.module.ts`, `libs/contracts` (AuthMail, privacy/quote/order events, notificationSettingsSchema), gateway callers (`customer-auth.controller.ts`, `admin-settings.controller.ts`, `throttling.module.ts`, `shop.controller.ts` checkout), and ADRs 0009, 0020, 0021.

Checked, OK:
- Every event handler parses its payload with the contract's zod schema (`orderPlaced.parse(event)` and so on). A ZodError goes straight to the DLQ (retry-policy.ts:24-29). `ContactNotYetKnownError` is retryable and ends in the DLQ once retries run out, so there is no infinite poison loop.
- The auth email HTML escapes every interpolated value (`esc()` on lines, button, url, foot). The name only appears inside `c.lines`, which are escaped. The subject lines are constants, so there is no subject/header injection. `to` goes through nodemailer as an address field. Tokens sit only in the URL fragment and are never logged: ConsoleEmailProvider logs the subject only, and the notification_log body is the subject.
- No OTP codes exist in this service. Reset/verify tokens are never stored here.
- SMTP has timeouts (connection 10s, greeting 10s, socket 20s).
- Settings: `settings.update` is zod-parsed inside `SettingsStore.update`, the gateway route is `@Roles('OWNER')`, and the change is audited via the outbox in the same transaction.
- Account emails are rate-limited at the gateway (`@RouteThrottle('accountEmail')` + Turnstile). Checkout has a per-IP limit + Turnstile + Idempotency-Key. RFQ has `rfq` 5/h.
- DB: no unbounded findMany. The erasure `updateMany` by recipient is backed by `@@index([recipient])`. `order_contacts` lookups use the PK. `(event_id, template)` is unique.
- Phone format is consistent: order.placed and privacy.erased both carry `bdPhoneSchema`-normalised numbers, so erasure matches the stored recipients.
- No hard-coded secrets. SMTP credentials come from env only.

## Service map
- Responsibility: turns domain events into customer/owner SMS (console-only today), sends account emails (sync RPC, ADR 0021), and holds the owner alert phone setting (ADR 0017).
- Entry: `src/main.ts` -> `bootstrapService(AppModule, 'notification-service')`. HTTP 3007 (health), TCP 4007.
- DB schema `notifications`: `outbox_events`, `processed_events`, `order_contacts` (name/phone per order), `notification_logs` (recipient + full body), `settings`.
- TCP patterns: `notification.email.auth` (AuthEmailRpcController.send), `notification.admin.settings.get`, `notification.admin.settings.update`.
- Calls: no other services. External: SMTP (nodemailer) and an SMS provider (ConsoleSmsProvider only, hard-wired in app.module.ts:31).
- Publishes (outbox): `audit.recorded` from settings updates (via SettingsStore/recordAudit).
- Consumes (EventConsumer.subscribe): `privacy.erased` -> notification.privacyErased; `order.placed` -> notification.orderPlaced; `payment.verified` -> notification.paymentVerified; `order.confirmed` -> notification.orderConfirmed; `order.status_changed` (orderStatusChanged.type) -> notification.orderStatusChanged; `order.cancelled` -> notification.orderCancelled; `quote.requested` -> notification.quoteRequested.

## Findings

### MSG-1: SMS is sent from inside the consumer's DB transaction, so any rollback after a successful send re-sends it. Prisma's default 5s interactive-tx timeout makes this systematic with a slow gateway.
- Severity: Medium today (console driver). It becomes High as soon as the paid M3 gateway is wired in: duplicate paid SMS, up to 4x per event.
- Confidence: Confirmed (code path). The timeout interaction needs a runtime check.
- Effort: M. Needs approval: no (adding a `PENDING` value to the enum is additive, and so is a nullable `attempted_at`).
- Location: `backend/apps/notification-service/src/notify/notification.service.ts:162-187`, `backend/libs/common/src/messaging/event-consumer.ts:80-89`, `backend/apps/notification-service/src/prisma/prisma.service.ts:23-25`
- Code:
```ts
// event-consumer.ts
this.db.transaction(async (tx) => {
  const inserted = await tx.$executeRaw`INSERT INTO processed_events ... ON CONFLICT DO NOTHING`;
  if (inserted === 0) return 'duplicate' as const;
  await handler.handle(event, tx);
// notification.service.ts
const already = await tx.notificationLog.findUnique({ where: { eventId_template: { eventId, template } } });
if (already?.status === 'SENT') return;
const { providerRef } = await this.sms.send(to, body);
await tx.notificationLog.upsert({ ... status: 'SENT' ... });
// prisma.service.ts
transaction<T>(fn) { return this.$transaction((tx) => fn(tx)); }   // no timeout/maxWait options
```
- Problem & impact: The send-log is written in the same transaction as `processed_events`, so it protects against nothing beyond what `processed_events` already does. If anything fails after `sms.send` resolves, the log row rolls back with everything else and the retry queue sends the SMS again. Causes include the upsert failing, the commit failing, the process being killed, or, most importantly, the Prisma interactive transaction exceeding its default 5000 ms timeout. `$transaction` is called without `timeout`, and `SmsProvider.send` has no timeout contract. A BD SMS gateway that takes about 5s or more to respond means every SMS is delivered, the transaction is aborted (P2028), and the event is retried 3 times (EVENT_RETRY_DELAYS_MS) before the DLQ. That is 4 paid SMS per event and nothing in the DLQ says they were sent. The code comment (lines 22-26) accepts "a crash" as the only duplicate cause, but the timeout makes it routine. It also holds a pooled DB connection open across an external HTTP call for up to 10 concurrent messages (PREFETCH = 10). The `FAILED` enum value is never written for SMS either, because the throw rolls the row back.
- Fix: Claim the send outside the consumer transaction. Steps:
  1. In a short committed transaction, `INSERT notification_logs (event_id, template, status='PENDING') ON CONFLICT DO NOTHING`. If a row already exists and is SENT, or PENDING and recent, skip.
  2. Call the provider with a hard timeout (AbortSignal, well under the tx timeout). Pass `${eventId}:${template}` as the client reference/idempotency key if the gateway supports one.
  3. Update the row to SENT, or FAILED with an attempt count, in its own write.

  Let the consumer transaction only record `processed_events` + `order_contacts`. As a minimum interim step, pass `{ timeout, maxWait }` to `$transaction`, and make the M3 SmsProvider contract require a timeout shorter than that.

### SEC-1: Production SMS logging prints every customer phone number and full message (order code + tracking link) at info level
- Severity: Medium. Confidence: Confirmed. Effort: S. Needs approval: no
- Location: `backend/apps/notification-service/src/sms/sms.provider.ts:17-24`, `backend/apps/notification-service/src/app.module.ts:30-31`, `backend/apps/notification-service/src/config/notification-env.ts:12`
- Code:
```ts
send(to: string, body: string): Promise<SmsResult> {
  this.logger.log(`[SMS -> ${to}] ${body}`);
// app.module.ts
// M3: real SMS gateway provider (paid, owner approval).
{ provide: SMS_PROVIDER, useValue: new ConsoleSmsProvider() },
// env
SMS_DRIVER: z.enum(['console']).default('console'),
```
- Problem & impact: The console provider is the only provider and is hard-wired regardless of NODE_ENV, so it is what runs in production until M3. Each log line contains the customer's phone and the order code. Code + phone is exactly the credential for public order tracking (`trackQuerySchema = { code, phone }`), which exposes name, address and items. Anyone with log access (log shipping, the VPS, support screenshots) can therefore open any order. These lines also escape privacy erasure: ADR 0020 redacts `notification_logs`, but cannot redact log files. The logger redacts only auth headers and cookies (logger.module.ts:28). The email provider was carefully written to avoid this ("without the address or the links"), and the SMS provider is not.
- Fix: In ConsoleSmsProvider, log the masked recipient (`01*******78`) and the template name or length only. Print the full body only when `NODE_ENV === 'development'`. Whatever real provider comes later should get the same rule.

### SEC-2: SMTP on port 587 uses opportunistic STARTTLS (`requireTLS: false`), so credentials and reset links can be sent in plaintext after a STARTTLS-strip
- Severity: Medium (production only, once SMTP credentials are set). Confidence: Confirmed. Effort: S. Needs approval: no
- Location: `backend/apps/notification-service/src/email/email.provider.ts:33-43`
- Code:
```ts
this.transport = createTransport({
  host: config.host, port: config.port, secure: config.secure,
  // Port 587/25: upgrade to TLS whenever the server offers it.
  requireTLS: false,
  auth: config.user ? { user: config.user, pass: config.pass } : undefined,
```
- Problem & impact: With the default `SMTP_SECURE=false` / port 587, an on-path attacker between the VPS and the mail provider can strip the STARTTLS offer. Nodemailer then sends AUTH (the SMTP username/password) and every message in cleartext. That includes password-reset links whose fragment carries the live reset token, which means account takeover.
- Fix: Use `requireTLS: !config.secure && !!config.user`, so TLS is required whenever credentials are used (Mailpit in dev has no user and is unaffected). Alternatively, add an `SMTP_REQUIRE_TLS` env defaulting to true outside development.

### SEC-3: No per-recipient SMS cap. Each order placed with a victim's number sends them an SMS, and only per-IP limits stand in the way.
- Severity: Low now (console). Medium once SMS is paid (cost abuse, and harassing a third-party number under the Zelqune name). Confidence: Confirmed. Effort: S-M. Needs approval: no
- Location: `backend/apps/notification-service/src/notify/notification.service.ts:58-82` (send path at 162-187). Upstream throttle: `backend/apps/gateway/src/config/*` `CHECKOUT_MAX_PER_IP ... default(10)` / `CHECKOUT_IP_WINDOW_SECONDS ... default(600)`
- Code:
```ts
async onOrderPlaced(event: EventEnvelope, tx: Tx): Promise<void> {
  ...
  await this.send(tx, event.id, 'order.placed', contact.phone,
    templates.orderPlaced(contact, this.config.STOREFRONT_URL));
```
- Problem & impact: Checkout is protected by Turnstile + 10 per IP per 10 min. An attacker rotating IPs (cheap with mobile carrier NAT or proxies) can place guest COD orders with an arbitrary phone. Each order sends an SMS to that number (and a cancellation SMS later). Nothing in notification-service counts messages per recipient, even though `@@index([recipient])` already exists to support it.
- Fix: Before sending a customer SMS for `order.placed`, count `notification_logs` for that recipient and template in the last hour or day (indexed by recipient; add `@@index([recipient, createdAt])`). Above a threshold (for example 5/day), skip the send, log a masked warning, and record the row as `SUPPRESSED`. Status-change SMS for real orders can stay unthrottled.

### MSG-2: Privacy erasure redacts SMS rows by phone only. Account-email rows (`recipient` = email address) are kept forever and never erased.
- Severity: Low. Confidence: Confirmed. Effort: S. Needs approval: yes (this needs `privacy.erased` to carry an email, or a new account-deleted event, which changes a message payload shape)
- Location: `backend/apps/notification-service/src/notify/notification.service.ts:48-56`, `backend/apps/notification-service/src/email/auth-email.rpc.controller.ts:34-45`
- Code:
```ts
await tx.notificationLog.updateMany({
  where: { recipient: p.phone },
  data: { recipient: 'ERASED', body: '[erased on request]' },
});
// auth-email.rpc.controller.ts
recipient: mail.to,   // email address
channel: 'EMAIL',
```
- Problem & impact: Since ADR 0021 the log also stores customer email addresses (one row per verify/reset/exists/phoneTaken email). ADR 0020 erasure only touches rows whose recipient equals the phone, so emails stay. There is also no retention on `notification_logs` or `order_contacts` (names + phones for every order, forever).
- Fix: Include the account's verified email(s) in `privacy.erased` (optional field, additive) and redact `recipient IN (phone, email)`. Separately, add a retention job, for example nulling the body/recipient of logs older than N months (owner decision).

### OPS-1: Misconfigured email silently falls back to "console", and the service `.env.example` is missing all email variables
- Severity: Low. Confidence: Confirmed. Effort: S. Needs approval: no
- Location: `backend/apps/notification-service/src/app.module.ts:35-45`, `backend/apps/notification-service/.env.example:1-17`
- Code:
```ts
useFactory: (c: NotificationEnv) =>
  c.EMAIL_DRIVER === 'smtp' && c.SMTP_HOST
    ? new SmtpEmailProvider({...})
    : new ConsoleEmailProvider(),
```
- Problem & impact: `EMAIL_DRIVER=smtp` with an empty `SMTP_HOST` (a typo or a missing secret in prod) boots fine and then drops every verification/reset email. The gateway calls the RPC fire-and-forget (customer-auth.controller.ts:150-156), so users simply never get their email and nothing fails loudly. The per-service `.env.example` lists no `EMAIL_DRIVER`, `SMTP_*` or `MAIL_FROM`, which goes against the repo rule to keep .env.example files updated (they exist only in infra/.env.example).
- Fix: In `notificationEnvSchema`, add `.superRefine` so startup fails when `EMAIL_DRIVER === 'smtp'` and `SMTP_HOST` is missing. Add the email variables to the service `.env.example`.

### SEC-4: The `notification.email.auth` TCP handler trusts `req.data` without zod parsing, and `lang` goes unescaped into HTML and the URL
- Severity: Low (only the gateway reaches it over the private network, and the gateway forwards identity-service output). Confidence: Confirmed. Effort: S. Needs approval: no (an internal schema matching the existing TS type)
- Location: `backend/apps/notification-service/src/email/auth-email.rpc.controller.ts:23-26`, `backend/apps/notification-service/src/email/auth-emails.ts:104,114`
- Code:
```ts
async send(@Payload() req: RpcRequest<AuthMail>): Promise<{ sent: boolean }> {
  const mail = req.data;
  const message = authEmail(mail, this.config.STOREFRONT_URL);
// auth-emails.ts
const base = `${site.replace(/\/$/, '')}/${m.lang}/account`;
const html = `<!doctype html><html lang="${m.lang}">...
```
- Problem & impact: `AuthMail` is a TS-only type, with no zod schema in contracts. Anything that can reach TCP 4007 can make the service send branded Zelqune email to any address with an arbitrary `to`/`name`/`token`/`lang`. `lang` is inserted raw into an attribute and into the link path, so it can inject markup or change the link, which gives a phishing relay. This is in line with the brief's "TCP handlers should parse data".
- Fix: Add `authMailSchema` (a discriminated union: `to: z.email()`, `name: max(100)`, `token: z.string().regex(/^[A-Za-z0-9_-]{20,200}$/)`, `lang: z.enum(['en','bn'])`) and parse it in the handler. Also apply `esc()` to `m.lang`.

### QUAL-1: Critical paths have no tests (auth email escaping/link building, the erasure handler, the auth-email RPC failure path)
- Severity: Low. Confidence: Confirmed (`notification.service.spec.ts` has 9 cases, all SMS/quote; there is no spec under `src/email/` and no `onPrivacyErased` test). Effort: S. Needs approval: no
- Location: `backend/apps/notification-service/src/notify/notification.service.spec.ts:77-270`, `backend/apps/notification-service/src/email/` (no spec)
- Code:
```ts
it('formats taka', ...
it('pre-order: placed SMS mentions the advance and tracking link; payment SMS confirms', ...
...
it('alerts the owner about construction enquiries', ...
```
- Problem & impact: An HTML-escaping regression in `auth-emails.ts` (user-controlled `name`), or an erasure regression that stops redacting logs (a privacy obligation under ADR 0020), would go unnoticed.
- Fix: Add `auth-emails.spec.ts` (a name like `<img src=x>` comes out escaped, the token appears only in the fragment, both languages) and an `onPrivacyErased` test (contacts deleted, logs redacted, other numbers untouched).
