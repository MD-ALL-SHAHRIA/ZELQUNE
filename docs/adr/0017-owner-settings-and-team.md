# 0017. Owner-editable settings and the team, stored by the service that uses them

- Status: Accepted
- Date: 2026-10-25

## Context
Payment numbers (bKash/Nagad), the pre-order advance, delivery fees and the owner's alert
phone were env values: changing one meant editing server config and restarting. Dashboard
access was a single seeded owner, with no way to add staff or change a password.

## Decision
- Each setting group lives in the service that reads it, in that service's own `settings`
  table (one JSON row per key): payments in payment-service, the advance in order-service,
  delivery fees in shipping-service, the alert phone in notification-service. A shared
  `SettingsStore` (libs/common) reads, validates and upserts the row and writes an audit
  event in the same transaction.
- Until a group is saved, the service's env values are the defaults; a stored row that no
  longer validates falls back to them, so a bad row can never break checkout.
- Settings are read on use (no cache), so a change applies to the next quote or checkout.
- The gateway exposes `GET|PUT /v1/admin/settings/{payments,checkout,shipping,notifications}`:
  staff may read, only the owner may change.
- identity-service manages the team (`/v1/admin/team`, owner only): add members with a
  password, change role or access, reset a password. Role or access changes and resets revoke
  the member's refresh tokens at once. Nobody can change their own role or access, and the
  last active owner cannot be demoted or removed. Everyone can change their own password and
  profile (`/v1/admin/account/*`).
- The store's public contact details stay in the home content document (ADR 0015); the
  dashboard's Settings page edits them there.

## Consequences
- No restarts or redeploys to change everyday business settings; every change is audited.
- Env values remain the bootstrap defaults (keep `.env.example` current).
- One extra read per checkout quote per service; acceptable at this scale.
