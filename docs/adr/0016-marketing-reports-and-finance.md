# 0016. Coupons, sales, reports and profit and loss, split by data owner

- Status: Accepted
- Date: 2026-10-24

## Context
The owner needs to run the business from the admin: flash and seasonal sales, coupon codes,
sales and customer reports, an expense ledger and a profit and loss statement. The data these
need is spread across services: order lines in order-service, prices and costs in
catalog-service, and nothing yet for expenses.

## Decision
Each piece lives with the service that owns its data; nothing reads another service's tables.
- **Sales (Promotion)** live in catalog-service and are applied inside price resolution
  (`applySale`), so the storefront, the cart and checkout all charge the same sale price. The
  best covering sale wins; prices from a price-experiment arm are left alone; a sale never
  takes a price under ৳1. `GET /v1/catalog/sale` feeds the storefront banner and countdown.
- **Coupons** live in order-service (they change order totals). They are validated in the cart
  quote and checkout, and redeemed (`used_count + 1`, guarded by `max_uses`) in the same
  transaction that creates the order, so a code can never be over-redeemed. Shipping is never
  discounted. Redeemed coupons are deactivated, not deleted, so reports keep them.
- **Unit cost** is a nullable `costPaisa` on the catalog variant (admin only).
- **Expenses** live in analytics-service, which already owns reporting.
- **Reports** (sales by day/product/variant/district/payment/channel/coupon, customers by
  phone, units sold per month) are read-only queries in order-service. Revenue counts orders
  that were confirmed and not cancelled, returned or refunded, matching the analytics rule.
- **Profit and loss** is composed by the gateway from units sold (order), unit costs
  (catalog) and expenses (analytics): net sales - cost of goods = gross profit; + shipping
  charged - expenses = net profit. Sold variants with no cost are listed so the owner can fix
  them. Finance routes are OWNER only.

## Consequences
- No new service and no cross-schema joins; every write is audited by its owner.
- P&L uses today's unit cost for past sales (no cost snapshot on order lines). Acceptable for
  a small catalog; snapshot `costPaisa` on order items if costs start moving.
- Sales apply from the next price read (storefront pages revalidate within 60 s).
