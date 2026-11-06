# 0023. Guest checkout; accounts optional for shop orders

- Status: Accepted (amends 0021 for shop orders)
- Date: 2026-11-06

## Context
ADR 0021 made a verified customer account (email link before the first sign-in) a condition
of every order. Most Bangladeshi shoppers arrive from Facebook on a phone and rarely use email;
asking them to register, open an email and sign in before buying a ৳3,000–9,000 piece loses
many of them. Phone-only sign-in needs a paid SMS gateway, which is not approved yet.

## Decision
- `POST /v1/checkout` is public again with `@OptionalAccount()`: no token = guest order (name and
  phone, as before 0021); a valid CUSTOMER token links the order to the account (the account id
  still comes only from the verified token); an invalid or expired token answers 401 so the
  storefront refreshes it and retries; other roles count as guests.
- The storefront checkout shows the form to everyone, with "No account needed. Have one? Sign in
  to fill in your details"; signed-in customers get the prefilled form as before.
- Unchanged: Turnstile, per-IP limits and the cart-scoped Idempotency-Key on checkout; tracking by
  order code + phone; bulk, interior design and construction requests still need an account
  (larger jobs, where a verified email is worth the step).

## Consequences
- Fewer steps to buy. Guest orders carry no verified email; staff confirm by phone (already
  required for COD and advance checks). Guest orders do not appear in an account portal.
