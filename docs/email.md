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

## Switch it on in production: Resend (about 15 minutes, once)

We use **Resend** (resend.com): made for website emails, free plan to start, and emails come
from **support@zelqune.com**. Everything on the website side is already set; you only create the
account, prove you own zelqune.com, and copy one key.

### 1. Create the account
Go to **resend.com** → **Get started** → sign up with the Gmail you use for Zelqune. Confirm the
email Resend sends you.

### 2. Add zelqune.com
In Resend: **Domains** → **Add domain** → type `zelqune.com` → for the region choose the one
closest to Bangladesh in the list → **Add**.

Resend now shows a short list of DNS records (a few TXT and one MX, mostly on `send` and
`resend._domainkey`). If Resend offers a button to add them to Cloudflare for you, use it and
sign in to Cloudflare when asked. Otherwise, for each record:

Cloudflare → **zelqune.com** → **DNS** → **Records** → **Add record** → copy *Type*, *Name* and
*Content* (and *Priority* for MX) exactly from Resend → proxy status **DNS only** (grey cloud) →
**Save**.

These records are on sub-names (`send`, `resend._domainkey`), so they do not touch the records
that forward support@zelqune.com to your Gmail. If Resend ever asks for an SPF record on
`zelqune.com` itself, do not add a second `v=spf1` record there: edit the existing one and add
Resend's `include:` before `~all`.

Back in Resend press **Verify DNS records**. It turns **Verified** within minutes (sometimes up to
an hour).

### 3. Create the key
Resend → **API Keys** → **Create API key** → name `Zelqune website`, permission **Sending
access**, domain **zelqune.com** → **Add**. Copy the key (starts with `re_`). It is shown once.
Do not paste it in a chat; it goes straight into the server settings.

### 4. Put it on the server
In `infra/.env.production` everything else is already filled in:

```
SMTP_PASS=re_...the key...
OWNER_NOTIFY_EMAIL=your-own@gmail.com
```

Restart: `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.production up -d notification-service`.

### 5. Check
- Create an account on the live site with your own email: the confirmation email arrives.
- Place a test order with your email: the order email and the new-order alert arrive.
- In Resend → **Emails** you can see every email sent and whether it was delivered.

If one day you send more than the free plan allows, upgrade in Resend; nothing in the website
changes. (Brevo, brevo.com, works the same way if you ever prefer it: change `SMTP_HOST`,
`SMTP_USER` and `SMTP_PASS`.)

Replies go to support@zelqune.com, which Cloudflare Email Routing already forwards to your Gmail.
