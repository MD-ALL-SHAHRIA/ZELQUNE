# 0022. Cash on delivery for pre-order and made-to-order items

- Status: Accepted (amends the advance rule in 0008)
- Date: 2026-11-06

## Context
Every product at launch is PRE_ORDER or MADE_TO_ORDER, and ADR 0008 refused COD for those, so
no customer could pay on delivery. Most Bangladeshi online shoppers expect COD, and a manual
bKash "Send Money + Transaction ID" step is the hardest part of checkout. The owner asked for COD.

## Decision
- New checkout setting `codForAdvanceOrders` (owner-editable in the dashboard, Settings >
  Checkout), **on by default**; rows saved before it existed read as on (zod default).
- When on, advance carts allow `[bKash, Nagad, COD]`: the advance stays first (and is the
  storefront's default choice), COD is the alternative. In-stock carts are unchanged (COD first).
- A COD order pays the whole total on delivery: payment kind `COD`, amount = total, and the
  order records `advanceRequiredPaisa = 0` (so SMS and the dashboard show cash on delivery).
- Confirmation is the existing COD flow: staff call the customer, then confirm COD in the
  dashboard (`payment.verified` -> order CONFIRMED). Unconfirmed orders still expire after
  `ORDER_HOLD_HOURS`.

## Consequences
- Easier to buy; more orders without money up front, so fake or abandoned made-to-order orders
  become a risk. Mitigation: phone confirmation before work starts; the owner can switch the
  setting off at any time (then the storefront copy promising COD should be edited too).
