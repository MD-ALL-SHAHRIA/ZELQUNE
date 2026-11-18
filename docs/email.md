# Email: what Zelqune sends and how to switch it on

notification-service sends every email through one SMTP connection. In development all of it
lands in **Mailpit** (http://localhost:8025) and nothing leaves the computer. In production it
goes through an email provider you sign up for once (below).

## What is sent

| When | To | Email |
|---|---|---|
| Sign-up | Customer | Confirm your email (link sets the password) |
| Sign-up with an email that already has an account | That inbox | You already have an account (sign-in link) |
| Forgot password | Customer | Reset your password |
| Order placed | Customer (if they gave an email) | Order received: items, delivery, total, what to pay now and on delivery, track link |
| Order placed | Owner (`OWNER_NOTIFY_EMAIL`) | New order: customer, phone, items, payment, total |
| bKash/Nagad advance verified | Customer | Payment received, order confirmed |
| Cash-on-delivery order confirmed | Customer | Order confirmed, amount to pay on delivery |
| Status: in production / shipped / delivered | Customer | Your piece is being made · On its way · Arrived, thank you (asks for a photo) |
| Order cancelled | Customer | Cancelled, and what happens to an advance |
| Bulk, design or construction request | Owner | New request |
| Same request | Customer (if they gave an email) | Request received, code, check-status link |

Every order email also goes out as SMS (Bangla). Emails use the language the customer ordered in.
Each email is sent at most once per event, even when an event is retried.

The checkout asks for an email as optional; signed-in customers get their account email filled in.

## Switch it on in production (about 20 minutes, once)

You need: access to Cloudflare (zelqune.com) and an email provider account. Both providers below
have a free plan that is enough to start; check their current limits when you sign up.

- **Resend** (resend.com): simplest setup.
- **Brevo** (brevo.com): also has a dashboard to see every email sent.

### 1. Add the domain at the provider
Sign up, choose **Add domain**, type `zelqune.com`. The provider shows a few DNS records
(usually 2–3 TXT/CNAME records for DKIM, plus one for SPF).

### 2. Add those records in Cloudflare
Cloudflare → zelqune.com → **DNS** → **Records** → **Add record**, one per record the provider
listed. Set them to **DNS only** (grey cloud).

SPF: if the provider's SPF record is on a subdomain (for example `send.zelqune.com`), add it
exactly as shown. If it is on `zelqune.com` itself: you already have one TXT record there that
starts with `v=spf1` (from Email Routing for support@). **Do not add a second one** (two SPF
records break both). Edit the existing one and add the provider's `include:` before `~all`:

```
v=spf1 include:_spf.mx.cloudflare.net include:<what the provider shows> ~all
```

Then add a DMARC record if you have none:

| Type | Name | Content |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:support@zelqune.com` |

Back at the provider, press **Verify**. It can take a few minutes.

### 3. Put the SMTP details on the server
The provider shows SMTP settings. In `infra/.env.production`:

```
EMAIL_DRIVER=smtp
SMTP_HOST=smtp.resend.com        # or smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false                # 587 upgrades to TLS (required whenever a password is set)
SMTP_USER=resend                 # what the provider shows
SMTP_PASS=...                    # the API key / SMTP key
MAIL_FROM=Zelqune <support@zelqune.com>
OWNER_NOTIFY_EMAIL=your-own@gmail.com
```

Restart: `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production up -d notification-service`.

### 4. Check
- Create an account on the live site with your own email: the confirmation email arrives.
- Place a test order with your email: the customer email and the owner email arrive.
- In Gmail, open the email → **Show original**: SPF, DKIM and DMARC say **PASS**.

Replies go to support@zelqune.com, which Cloudflare Email Routing already forwards to your Gmail.
