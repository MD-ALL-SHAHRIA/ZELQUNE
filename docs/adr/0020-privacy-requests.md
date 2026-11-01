# 0020: Privacy requests

Date: 2026-11-01. Status: accepted.

## Context
The Privacy Policy promises that customers can see, correct and delete their personal data.
There are no customer accounts: customers are known by their phone number, and personal data
sits in four services (order: orders, quotes, customer flags; payment: payer phone;
notification: order contacts and SMS logs; analytics: a pseudonymous customer key only).

## Decision
- **Where:** `order-service` owns `privacy_requests` (it holds most of the data). Public
  `POST /v1/privacy-requests` (Turnstile, `rfq` rate limit) and `POST /v1/privacy-requests/track`
  (code + phone, `track` rate limit). Admin routes `/v1/admin/privacy-requests/*` are **OWNER only**.
- **No enumeration:** the public answer is a request code, the same whether or not the phone has
  records. A second open request of the same type for the same phone returns the first code.
- **Identity:** knowing a phone number or an order code is not proof. The owner confirms by
  calling the number on file or receiving a WhatsApp message from it, records the method, and
  only then can export, correct or erase (`IN_PROGRESS`). Statuses: PENDING ->
  VERIFICATION_REQUIRED -> IN_PROGRESS -> COMPLETED, or REJECTED (with a reason) from any open
  status. Transitions are conditional updates, so double clicks cannot apply twice.
- **Access:** a JSON export of everything order-service holds for the phone, plus a list of what
  other services hold. The owner sends it to the number on file only.
- **Correction:** name and/or email on every order and request for the phone.
- **Deletion:**
  - orders cancelled before any payment, and requests that never became a sale, are anonymised
    (`ERASED`), order notes deleted, the customer flag deleted;
  - orders that are a sale (confirmed, delivered, returned, refunded) are **kept** as accounting
    records, and any quote that became one of them is kept too;
  - running orders **block** the erasure until they finish or are cancelled;
  - the `privacy.erased` event makes payment-service clear the payer phone on erased orders,
    notification-service delete their contacts and redact every SMS log to that number, and
    analytics unlink the customer key and visit id (totals stay).
  - The request keeps a masked phone, plus an HMAC so the requester can still check the status.
- **Consent withdrawal:** there is no marketing list and cookie choices live in the browser, so
  it is recorded with a note of what was done.
- **Audit:** every step writes an audit entry with the request code and counts, never names or
  phone numbers.

## Not covered (stated in the dashboard and the policy, not hidden)
- Database backups keep earlier copies until they expire (backup retention is not set yet).
- WhatsApp chats live in WhatsApp. Cloudflare and Meta data follow their own policies.
- Retention periods for sale records are an owner/lawyer decision (`[[...]]` in the policy); until
  then sales are kept.
- No confirmation email or SMS is sent: there is no email provider yet and SMS is console-only.
