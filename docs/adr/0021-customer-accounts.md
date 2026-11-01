# 0021: Customer accounts

Date: 2026-11-01. Status: accepted (backend). Storefront pages and the checkout requirement follow.

## Context
The owner wants every order and request tied to a real account (no guest checkout), so the
dashboard shows the customer's real name, verified email and phone. Customers sign in with
email + password, Google or Facebook. SMS one-time codes need a paid gateway and are not used yet.

## Decision
- **identity-service** owns customers (`users`, role CUSTOMER). Email is the sign-in name and must
  be verified before sign-in; name and phone (unique, E.164) are always required. New tables
  `auth_tokens` (single-use email links, SHA-256 stored) and `oauth_accounts`.
- **Gateway** `/v1/auth/*`: register, login, refresh, logout, verify-email, resend-verification,
  forgot-password, reset-password, me (GET/PUT), change-password, sessions (list, end one, end
  all others), providers, and the Google/Facebook flow (start, callback, pending, complete).
- **Sessions:** the existing rotating refresh-token families (reuse = theft, family revoked), in a
  separate HttpOnly cookie `zq_crt` scoped to `/v1/auth`, SameSite=Strict, origin-checked.
  Customer and admin sessions never cross: customer refresh accepts only CUSTOMER, admin refresh
  only OWNER/STAFF, and admin routes refuse customer tokens.
- **Passwords:** argon2id (OWASP parameters); NIST 800-63B rules: 10 to 128 characters, no
  composition rules, refused if common, repetitive, sequential or containing the person's name,
  email or phone.
- **No enumeration:** register, resend and forgot always answer 202 "accepted"; the email tells
  the address owner what happened ("you already have an account", "phone already used").
  Emails are sent after the answer is decided, so timing does not differ.
- **Abuse limits:** per-IP limits (login, account emails), a per-account lock after 5 failed
  passwords, Turnstile on register and forgot.
- **Links:** 24 h (verify) / 30 min (reset), single use (conditional update), a new link voids
  older ones. The token sits in the URL fragment (`#token=`), which is never sent to servers or in
  Referer headers. A reset also verifies the email and signs out every session.
- **Email delivery:** notification-service `EmailProvider` (SMTP via nodemailer, or console). The
  gateway calls it by RPC with the link, so the raw token never sits in a queue, the outbox or a
  log; the notification log keeps the subject only. Dev uses Mailpit.
- **Google / Facebook:** authorization code flow with PKCE (S256), a one-time `state` in Redis
  bound to the browser by a cookie, a `nonce` checked in Google's signed ID token (verified
  against Google's keys), server-side code exchange, Facebook `appsecret_proof`. Linking only via
  a provider-verified email. If a matching account never verified its email, its password is
  removed and its sessions ended (pre-registration takeover defence). Admin accounts never
  link. A first social sign-in asks for name and phone before the account exists. Off until the
  owner sets the keys (docs/accounts-setup.md).

## Orders and requests
- Checkout and quote requests (bulk, design, construction) need a CUSTOMER token
  (`RequireAccount`); the gateway passes `customerUserId` from the verified token, never from the
  body. Orders and quotes store `customer_user_id`; B2B orders converted from a quote inherit it.
- `/v1/me/orders` and `/v1/me/requests` return only the caller's records.
- Tracking by code + phone and privacy requests stay open without an account (a privacy right
  must not depend on having one).
- The dashboard order page shows the account (name, verified email, phone, sign-in method); the
  Customer accounts page lists sign-ups.

## Later
- SMS one-time codes once an SMS gateway is approved; optional two-step verification.
