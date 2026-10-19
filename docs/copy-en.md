# Zelqune website copy: English (copy-en.md) v1

> Put this in the repo as `docs/copy-en.md`. English is the default language; Bangla lives in `docs/copy-bn.md` with the same structure. Fill every `[[...]]` once the prototype and supplier details are known; the site must not launch with any left.
> Rules: no invented reviews, no "X people bought this" counters, no fake countdowns. Never say "in stock" for a pre-order product.

## Brand
- **Name:** Zelqune
- **Tagline:** The warmth of wood and light, at home.
- **SEO description:** Handcrafted wood and soft-light wall decor. Designed in Dhaka, delivered across Bangladesh.

## Header and footer
- **Menu:** Home · Shop · Bulk & Corporate · Track order · FAQ
- **Cart:** Cart · Your cart is empty · Go to checkout
- **Footer:** Contact: [[phone/WhatsApp]] · Facebook · Instagram · Terms · Returns · Privacy
- **Copyright:** © 2026 Zelqune. All rights reserved.

## Home
- **Hero heading:** Wood and light for your walls
- **Hero subline:** The Alo-Arch Panel: a walnut frame, glass vases, and a warm, soft glow for your evenings.
- **Button:** Pre-order now
- **Three benefits:**
  - **Handcrafted:** every panel is made with care after you order.
  - **Safe light:** 5V USB lighting. No 220V wiring inside the wood.
  - **Small advance:** just ৳300 upfront, the rest when it arrives.
- **Bulk banner:** Need several for an office, café, restaurant or corporate gift? [Request a bulk quote]

## Product page: Alo-Arch Panel
- **Name:** Alo-Arch Panel
- **Short description:** An arched wooden panel with glass tubes for fresh or dried flowers, and a warm LED glow behind them. A vase by day, a soft lamp by night.
- **What you get:**
  - Size: [[32 × 64 cm, confirm after prototype]]
  - Wood: walnut-tone veneer with a cream frame ([[confirm finish with supplier]])
  - Light: 5V USB, warm white
  - Glass tubes: [[number]]
  - Wall-mounting kit (screws and hooks)
- **Variants:** Walnut (dark) · Natural (light)
- **Badges:**
  - Pre-order: "Pre-order · ships within [[N]] days"
  - Made to order: "Made to order · [[N]] days"
  - In stock: "In stock · delivered in 1–3 days" (only when actually in stock)
- **Delivery fee field:** Delivery fee: shown when you choose your area
- **Pre-order note (small box):** This is a pre-order. Pay a ৳300 advance to confirm, the rest on delivery. If we can't deliver on time, you get your full advance back.
- **Buttons:** Add to cart · Pre-order now

## Checkout
- **Heading:** Confirm your order
- **Fields:** Your name · Mobile number (01XXXXXXXXX) · District · Area/Thana · Full address · Delivery note (optional)
- **Payment:**
  - **bKash/Nagad advance:** Send ৳300 to [[bKash number]] / [[Nagad number]] (Send Money), then enter the Transaction ID below.
  - **Cash on delivery:** Pay when it arrives. (In-stock items only)
- **Transaction ID field:** Transaction ID (e.g. 9AB1C2D3EF)
- **Summary:** Items · Delivery · Total · Pay now (advance) · Pay on delivery
- **Button:** Place order
- **Errors:**
  - That mobile number doesn't look right. Use an 11-digit number starting with 01.
  - This Transaction ID has already been used. Please check it.
  - This item is out of stock right now.
  - Something went wrong. Please try again shortly, or call us at [[phone]].

## Order placed
- **Heading:** Thank you! We've received your order
- **Text:** Your order code is **{code}**. Keep it to track your order. We'll check your payment and confirm by SMS.
- **Buttons:** Track order · Keep browsing

## Track order
- **Heading:** Where's my order?
- **Fields:** Order code (ZQ-XXXXXX) · Mobile number
- **Statuses:**

| Status | Label |
|---|---|
| PENDING_PAYMENT | Awaiting payment |
| PAYMENT_SUBMITTED | Checking payment |
| CONFIRMED | Confirmed |
| IN_PRODUCTION | Being made |
| READY_TO_SHIP | Ready to ship |
| SHIPPED | With the courier |
| DELIVERED | Delivered |
| CANCELLED | Cancelled |
| RETURN_REQUESTED | Return requested |
| RETURNED | Returned |
| REFUNDED | Refunded |

- **Not found:** We couldn't find an order with that code and number.

## Bulk & corporate orders (B2B)
- **Heading:** Bulk orders for offices, businesses and gifting
- **Text:** Need several pieces, a logo engraving or a custom size? Send a request and we'll quote a price for your quantity.
- **Who orders:** Interior firms · Cafés and restaurants · Offices · Corporate gifts · Events
- **Fields:** Company name · Contact person · Mobile number · Email (optional) · Product · Quantity · Needed by · Customisation (logo engraving, size, colour) · Anything else
- **Button:** Send request
- **After sending:** Thank you! Your request code is **{code}**. We'll send you a price. Use this code and your number to check its status.
- **Quote statuses:** New (being priced) · Quoted (valid until {validUntil}) · Accepted · Declined · Expired

## FAQ
- **Is the light safe?** Yes. It runs on 5V USB, like a phone charger. There's no 220V wiring inside the wood.
- **How do I hang it?** Screws and hooks are included. Drill two holes and hang it. You'll need a USB port or charger nearby.
- **What goes in the glass tubes?** Fresh flowers with water (change it every 2–3 days), or dried flowers and pampas grass.
- **How do I care for it?** Wipe with a soft, dry cloth. Wipe off any water on the wood right away.
- **How long does delivery take?** Pre-orders are made and shipped within [[N]] days. The courier takes 1–2 days in Dhaka and 2–4 days outside Dhaka.
- **When do I get my advance back?** If we can't deliver on time, or we cancel your order, we refund the full advance to the same bKash/Nagad number within [[7]] days.
- **What if it arrives damaged?** Tell us within 24 hours of delivery with a photo or video, and we'll replace it or refund you.

## Terms and returns (summary)
- A pre-order is confirmed once the ৳300 advance is verified.
- If the advance doesn't arrive within 48 hours, the order is cancelled automatically.
- If you cancel before production starts, your advance is refunded. Once production has started, the advance is not refundable.
- Damaged or defective items reported within 24 hours are replaced or refunded. Returns for change of mind: [[policy to decide]].
- Each piece is handmade from wood, so colour and grain may vary slightly.
- Your phone number and address are used only for your order and delivery, never sold or shared.

## SMS
SMS stays in Bangla (see copy-bn.md): most customers read SMS in Bangla, and the templates are already short. [Assumption; switch if customers ask.]

## Interface strings (added in step 1.4, for owner review)
> Short labels the pages need that the sections above don't cover. Same structure in copy-bn.md.

### General
- **Language switcher:** Language · English · বাংলা
- **Skip link:** Skip to content
- **Common:** Close · Back · Loading… · Quantity · Remove · Price · From {price} · Item · Qty · Unit price · Total · Optional
- **Not found page:** We couldn't find that page. · Back to home
- **Error page:** Something went wrong on our side. Please try again. · Try again
- **Too many attempts:** Too many attempts. Please wait a few minutes and try again.
- **Photo placeholder:** [[Prototype photo coming soon]]
- **Photo count:** Photo {n} of {total}

### Page titles
- **Shop:** All products
- **Category empty:** No products here yet.
- **FAQ:** Frequently asked questions
- **Terms:** Terms
- **Returns:** Returns and refunds
- **Privacy:** Privacy
- **Privacy text:** Your phone number and address are used only for your order and delivery, never sold or shared. [[full privacy policy to write]]

### Product page
- **Variant label:** Finish
- **Delivery estimate:** Your district · Choose a district · Delivery to {district}: {fee} · We couldn't load the delivery fee. Please try again.
- **Added:** Added to cart
- **Quantity limit:** Up to {max} per item
- **Unavailable:** This item isn't available right now.

### Cart
- **Mixed items:** Pre-order and in-stock items can't be ordered together. Remove one to continue.
- **Continue:** Keep browsing
- **Unavailable line:** No longer available. Please remove it.

### Checkout
- **Sections:** Your details · Delivery address · Payment · Order summary
- **Payment options:** bKash advance · Nagad advance · Cash on delivery
- **Delivery fee pending:** Choose your district and area to see the delivery fee.
- **Field errors:** Please fill this in. · Please write the full address (house, road, area). · Enter the Transaction ID from your bKash/Nagad message. · Please complete the security check.
- **Sending:** Placing your order…
- **Empty cart:** Your cart is empty. Add a product first.
- **Price changed:** A price in your cart has changed. Please check the total and try again.

### Track order
- **Button:** Track
- **Sections:** Order history · Payment · Delivery
- **Courier link:** Track with the courier
- **Code format:** Order codes look like ZQ-XXXXXX.

### Bulk and corporate
- **Product field:** Choose a product · Something else (describe it)
- **Describe:** Describe what you need
- **Lines:** Add another product
- **Field errors:** Please enter a quantity of 1 or more. · That email address doesn't look right.
- **Sending:** Sending your request…
- **Track heading:** Check your quote
- **Track fields:** Request code (QT-XXXXXX) · Mobile number
- **Track button:** Check
- **Track not found:** We couldn't find a request with that code and number.
- **Quote details:** Quoted price · Delivery · Total · Advance to confirm · Needed by · This quote became order {code}.
- **Code format:** Request codes look like QT-XXXXXX.
