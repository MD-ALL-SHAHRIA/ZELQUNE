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
- **Footer:** Contact: message us on WhatsApp · Facebook · Instagram · Terms · Returns · Privacy
- **Copyright:** © 2026 Zelqune. All rights reserved.

## Home
- **Hero heading:** Handcrafted wood and gentle light, for walls that tell a *quiet story.* (the last words set in italic)
- **Hero button:** Explore the collection
- **Hero subline:** Sculptural wall pieces, made to order in Dhaka.
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
  - Size: 32 × 64 cm
  - Wood: walnut-tone veneer with a cream frame
  - Light: 5V USB, warm white
  - Glass tubes: 6
  - Wall-mounting kit (screws and hooks)
- **Variants:** Walnut (dark) · Natural (light)
- **Badges:**
  - Pre-order: "Pre-order · ships within 10 days"
  - Made to order: "Made to order · 10 days"
  - In stock: "In stock · delivered in 1–3 days" (only when actually in stock)
- **Delivery fee field:** Delivery fee: shown when you choose your area
- **Pre-order note (small box):** This is a pre-order. Pay a ৳300 advance to confirm, the rest on delivery. If we can't deliver on time, you get your full advance back.
- **Buttons:** Add to cart · Pre-order now

## Checkout
- **Heading:** Confirm your order
- **Fields:** Your name · Mobile number (01XXXXXXXXX) · District · Area/Thana · Full address · Delivery note (optional)
- **Payment:**
  - **bKash/Nagad advance:** Send ৳300 to the bKash / Nagad number shown at checkout (Send Money), then enter the Transaction ID below.
  - **Cash on delivery:** Pay when it arrives. (In-stock items only)
- **Transaction ID field:** Transaction ID (e.g. 9AB1C2D3EF)
- **Summary:** Items · Delivery · Total · Pay now (advance) · Pay on delivery
- **Button:** Place order
- **Errors:**
  - That mobile number doesn't look right. Use an 11-digit number starting with 01.
  - This Transaction ID has already been used. Please check it.
  - This item is out of stock right now.
  - Something went wrong. Please try again shortly, or message us on WhatsApp.

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
- **How long does delivery take?** Pre-orders are made and shipped within 10 days. The courier takes 1–2 days in Dhaka and 2–4 days outside Dhaka.
- **When do I get my advance back?** If we can't deliver on time, or we cancel your order, we refund the full advance to the same bKash/Nagad number within 7 days.
- **What if it arrives damaged?** Tell us within 24 hours of delivery with a photo or video, and we'll replace it or refund you.

## Terms and returns (summary)
- A pre-order is confirmed once the ৳300 advance is verified.
- If the advance doesn't arrive within 48 hours, the order is cancelled automatically.
- If you cancel before production starts, your advance is refunded. Once production has started, the advance is not refundable.
- Damaged or defective items reported within 24 hours are replaced or refunded. Returns for change of mind: unused items within 3 days, in the original box; you pay the return delivery.
- Each piece is handmade from wood, so colour and grain may vary slightly.
- Your phone number and address are used only for your order and delivery, never sold or shared.

## SMS
SMS stays in Bangla (see copy-bn.md): most customers read SMS in Bangla, and the templates are already short. [Assumption; switch if customers ask.]

## Interface strings (added in step 1.4, for owner review)
> Short labels the pages need that the sections above don't cover. Same structure in copy-bn.md.

### General
- **Language switcher:** Language · English · বাংলা
- **Theme toggle:** Switch to dark mode · Switch to light mode
- **Skip link:** Skip to content
- **Common:** Close · Back · Loading… · Quantity · Remove · Price · From {price} · Item · Qty · Unit price · Total · Optional
- **Not found page:** We couldn't find that page. · Back to home
- **Error page:** Something went wrong on our side. Please try again. · Try again
- **Too many attempts:** Too many attempts. Please wait a few minutes and try again.
- **Photo placeholder:** Photo coming soon
- **Photo count:** Photo {n} of {total}

### Page titles
- **Shop:** All products
- **Category empty:** No products here yet.
- **FAQ:** Frequently asked questions
- **Terms:** Terms
- **Returns:** Returns and refunds
- **Privacy:** Privacy
- **Privacy text:** Your phone number and address are used only for your order and delivery, never sold or shared. We keep order records for accounting for up to 5 years, use cookies only to keep your cart and language, and measure visits without storing personal details. To see or delete your data, message us on WhatsApp.

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

## Redesign strings (added in step 1.4 redesign, for owner review)
> Landing-page sections and navigation for the redesigned storefront. Same structure in copy-bn.md.

### Navigation
- **Menu:** Menu · Close menu · Our story
- **Footer columns:** Shop · Help · Company
- **Announcement:** Pre-orders are open · ৳300 advance, the rest on delivery

### Landing page
- **Hero eyebrow:** Sculptural wall decor · Made to order
- **Hero trust line:** Made in Bangladesh · Natural wood tones · Warm LED light
- **Hero wall:** Now on the wall · View piece · Pause the wall · Play the wall · Show {name} · Previous scene · Next scene
- **Hero secondary button:** See how it's made
- **Day and night eyebrow:** One piece, two moods
- **Day and night heading:** A vase by day. A soft lamp by night.
- **Day:** Day · Fresh or dried flowers in glass tubes, framed in walnut.
- **Night:** Night · Switch on the warm 5V glow and the flowers become a lamp.
- **Craft eyebrow:** The making
- **Craft heading:** Made slowly, by hand
- **Craft text:** Each panel is cut, sanded and finished by hand after you order. No two pieces of grain are the same.
- **Process eyebrow:** How pre-order works
- **Process steps:**
  - **Reserve with ৳300:** Pay a small advance by bKash or Nagad to confirm your piece.
  - **We make yours:** Your panel is made and checked within 10 days.
  - **Pay the rest on delivery:** The courier brings it to your door. Pay the rest in cash.
- **Rooms eyebrow:** Inspiration
- **Rooms heading:** Warmth for every room
- **Room names:** Living room · Bedroom · Café · Office
- **Values:**
  - **Handcrafted:** Made after you order
  - **Safe 5V light:** No 220V inside the wood
  - **৳300 advance:** The rest on delivery
  - **Across Bangladesh:** Delivered to all 64 districts
- **Business eyebrow:** For business
- **Sample photo note:** Sample photo. Real product photos are coming soon.

### Product page
- **Sections:** Details · Delivery and payment · Care

### Our story
- **Heading:** Our story
- **Text:** Zelqune began in a small Dhaka workshop with one idea: wood and soft light make a home feel warm. Every panel, shelf and lamp is designed here, cut and finished by hand by local craftspeople, and checked before it reaches your door.

## Product range and interior design (added in step 1.4 interior design, for owner review)
> New demo products (dev seed) and the Zelqune Interior Design service. Same structure in copy-bn.md.

### Products
- **Diamond Shelf (pair):** Two diamond-shaped walnut panels with floating shelves: bold geometry for plants, books and small treasures.
  - Size: 45 × 65 cm each
  - Wood: walnut-tone veneer
  - Two panels with floating shelves
  - Wall-mounting kit (screws and hooks)
- **Wave Shelf:** A curved walnut spine with a black wave and six floating shelves, part bookcase, part sculpture.
  - Size: 60 × 100 cm
  - Wood: walnut-tone veneer with black accents
  - Six floating shelves and a planter pocket
  - Wall-mounting kit (screws and hooks)
- **Half-Moon Planter Light:** A slatted half-moon, a walnut planter column and a warm LED ring: a living wall light.
  - Size: 70 × 90 cm
  - Light: 5V USB, warm white LED ring
  - Three planter cups for real or faux plants
  - Wall-mounting kit (screws and hooks)
- **Fluted Niche Panel:** Fluted walnut with warm LED lines, a lit niche for a sculpture and two floating shelves.
  - Size: 90 × 180 cm
  - Light: low-voltage warm white LED lines
  - Lit niche and two floating shelves
  - Installation by our team (inside Dhaka)
- **Capsule Vase Light:** A capsule frame with a soft LED halo and a glass vase for fresh stems.
  - Size: 35 × 70 cm
  - Light: 5V USB, warm white halo
  - Removable glass vase
  - Wall-mounting kit (screws and hooks)

### Navigation
- **Menu:** Shop · Interior Design · Bulk & Corporate · Our story
- **Shop menu:** Shop by category · All products

### Home page
- **Clients strip heading:** Trusted by businesses across Bangladesh
- **Hero slide 1 words:** Wood · Light
- **Hero slide 1 line:** Panels, shelves and lamps that turn a plain wall into the warm centre of a room.
- **Construction journey:** Stage {n} of {total} · Scroll to build · Approved
- **Hero slides 2–4:** Designed spaces · Built to last · Panels at scale (Plan a bulk order) · See our work
- **Categories eyebrow:** Featured collections
- **Categories heading:** Find your perfect piece
- **Categories link:** View all collections
- **Category card count:** {n} pieces
- **Collection arrows:** Previous collections · Next collections
- **Design band eyebrow:** Interior design
- **Design band heading:** Let us design the whole space
- **Design band text:** Homes, offices, restaurants and cafés: we plan the space, make the woodwork and lighting, and install it.
- **Design band buttons:** Explore interior design · Book a consultation

### Interior design
- **Eyebrow:** Zelqune Interior Design
- **Heading:** Spaces designed around wood and light
- **Lead:** From one feature wall to a whole café, we plan the space, make the woodwork and lighting in our workshop, and install it.
- **Sectors heading:** What we design
- **Sectors:**
  - **Home:** Living rooms, bedrooms and entrances that feel warm and calm.
  - **Office:** Reception walls, meeting rooms and workspaces with character.
  - **Restaurant & Café:** Feature walls, lighting and corners your guests remember.
  - **Hotel:** Lobbies and rooms with one handcrafted signature.
  - **Shop & Showroom:** Displays and walls that make your products glow.
- **Process heading:** How it works
- **Process steps:**
  - **Consultation:** We visit or call to understand your space, budget and timeline.
  - **Concept:** A layout, materials and a clear quote for the woodwork and lighting.
  - **Making:** Our workshop makes every piece to your measurements.
  - **Installation:** We install, style and hand over the finished space.
- **Included heading:** What's included
- **Included:** Site visit or video call · Layout and material plan · Custom woodwork and lighting · Installation and styling
- **Fees:** The first consultation is free. Design fees are quoted after the site visit.
- **Projects heading:** Selected projects
- **Projects placeholder:** Our first projects will be shown here soon.
- **Button:** Book a consultation
- **Sector page link:** Explore

### Design consultation form
- **Heading:** Book a design consultation
- **Text:** Tell us about your space and our designer will call you.
- **Fields:** Your name · Mobile number · Email (optional) · Type of space · Approximate size (sq ft) · District · Budget · When would you like to start? · Tell us about the space
- **Space types:** Home · Office · Restaurant & Café · Hotel · Shop & Showroom · Other
- **Budgets:** Under ৳1 lakh · ৳1–5 lakh · ৳5–15 lakh · Above ৳15 lakh · Not sure yet
- **Button:** Request consultation
- **Sending:** Sending your request…
- **After sending:** Thank you! Your request code is {code}. Our designer will call you within 1 working day.
- **Quote track label:** Interior design request · Space: {space}

## Header, listing, services and construction (added in step 1.4 RH-style redesign, for owner review)
> Same structure in copy-bn.md.

### Header and search
- **Header:** Search · Account · Construction · Close search
- **Search:** Search products and services · Products · Services and pages · Nothing found for "{q}".

### Account
- **Heading:** Your account
- **Text:** Signing in with your mobile number is coming soon. Until then, track any order or quote with its code and your phone number.
- **Buttons:** Track an order · Check a quote

### Product listing
- **Results:** {n} products
- **Availability:** Availability · All · Pre-order · Made to order · In stock
- **Sort:** Sort · Featured · Price: low to high · Price: high to low
- **Finishes:** {n} finishes
- **Clear:** Clear filters

### Home services
- **Services eyebrow:** Services
- **Services heading:** From one wall to a whole building
- **Services:**
  - **Interior Design:** Homes, offices, restaurants and cafés designed and installed.
  - **Construction:** Homes and commercial buildings from the ground up, interiors included.
  - **Bulk & Corporate:** Pieces in quantity for offices, hotels and gifting.

### Construction
- **Eyebrow:** Zelqune Construction
- **Heading:** From the ground up to the last light
- **Lead:** One team from the first drawing to the finished interior: we plan, build and furnish, so the building and everything inside it work together.
- **Types heading:** What we build
- **Types:**
  - **Family home:** Single-family houses and duplexes.
  - **Apartment building:** Multi-storey residential buildings.
  - **Commercial building:** Offices, shops and showrooms.
  - **Restaurant & hospitality:** Restaurants, cafés and small hotels.
- **Stages heading:** From land to living
- **Stages:**
  - **Plan & design:** Site survey, architectural and structural drawings (by licensed engineers).
  - **Approvals:** Help with building approvals (drawings and paperwork).
  - **Structure:** Foundation, frame and roof, with quality checks at each stage.
  - **Finishing:** Walls, floors, plumbing and electrical work.
  - **Interiors:** Woodwork, lighting and furniture by Zelqune.
  - **Handover:** A finished space, ready to live or work in (1-year workmanship warranty).
- **Why heading:** Why one team
- **Why:** One contract from foundation to furniture · Interiors planned with the structure, not after it · Clear stage-by-stage costs · Our own workshop for woodwork and lighting
- **Projects placeholder:** Our first construction projects will be shown here soon.
- **Button:** Start your project

### Construction enquiry form
- **Heading:** Start your building project
- **Text:** Tell us about your land and plans; our team will call you.
- **Fields:** Your name · Mobile number · Email (optional) · Type of building · Land or floor area (sq ft) · Number of floors · District · Budget · When would you like to start? · Tell us about the project
- **Building types:** Family home · Commercial building · Restaurant & hospitality · Hotel · Shop & showroom · Apartment building
- **Budgets:** Under ৳50 lakh · ৳50 lakh–1 crore · ৳1–3 crore · Above ৳3 crore · Not sure yet
- **Button:** Request a call
- **After sending:** Thank you! Your request code is {code}. Our team will call you within 1 working day.
- **Track label:** Construction request · {n} floors

### Additions from the RH-style build (for owner review)
- **Construction form:** Sending your request… · Please enter 1 to 60 floors. · {n} floor (one floor)
- **Construction:** Our buildings · Sample photo. Photos of our own projects are coming soon.
- **Product page:** You may also like
- **Category lines:**
  - **Wall panels:** Sculpted wood and warm light for a feature wall.
  - **Shelves:** Floating shelves in bold, handcrafted shapes.
  - **Lighting:** Soft, low-voltage light that turns wood into a lamp.

### Premium build (for owner review)
- **Scroll cue:** Scroll
- **Shop the room:** Shop the room · One room, lit by Zelqune · Tap a marker to see each piece in this room. · View piece
- **Materials:** Materials · Honest materials, finished by hand
  - **Solid wood:** Cut, sanded and oiled by hand in our workshop. Mahogany and engineered wood.
  - **Warm 5V light:** Low-voltage LEDs powered by USB, safe to touch.
  - **Glass and detail:** Clear glass and small metal details. Brass-finish fittings.
- **Trust:** Why Zelqune · Buy with confidence
  - **Pay the rest on delivery:** Only a ৳300 advance by bKash or Nagad. The rest is cash on delivery.
  - **Refund if we are late:** If we can't deliver on time, your advance is refunded within 7 days.
  - **Damage covered:** Tell us within 24 hours with a photo and we replace it or refund you.
  - **Made in Dhaka:** Designed and made in our own workshop. Dhaka, Bangladesh.
- **Product timeline:** Made for you · Today: Reserve with ৳300 · Our workshop: Made by hand in 10 days · Your door: Delivered in 1–4 days
- **Wall preview:** See it on your wall · Add a photo of your wall, then drag and resize the piece. Your photo stays on your phone. · Choose a photo · Try a sample wall · Size · Reset · Save image · Drag to move · use the slider to resize
- **WhatsApp:** Chat on WhatsApp · Hello Zelqune, I have a question about {item}
- **Statement:** Wood, light and space, made for the way Bangladesh lives.
- **Marquee words:** Solid wood · Warm LED light · Made in Dhaka · Made to order · Finished by hand

## Offers and coupons (added with flash sales and coupons, for owner review)
- **Sale badges:** Flash sale · Sale · {n}% off
- **Countdown:** Ends in {time} · {d}d {hh}:{mm}:{ss} · This sale has ended
- **Sale bar:** {name}: {n}% off · {name}: {amount} off · Shop the sale
- **Checkout coupon:** Coupon code · Enter a code · Apply · Remove · {code} applied · Discount ({code})
- **Coupon problems:**
  - This code is not valid.
  - This code is no longer active.
  - This code is not active yet.
  - This code has expired.
  - This code has been fully used.
  - Your order needs to be at least {amount} for this code.

## Product page redesign (after the Apex case study, for owner review)
- **Buttons and title:** Buy now · Share · Link copied
- **Size:** Size · {w} × {h} cm
- **Delivery card:** Delivery across Bangladesh
- **Cross-sell:** Complete the wall · Pieces that sit well beside this one · Add · Added

## Cookies and consent

- **title:** Cookies on Zelqune
- **text:** We use necessary cookies to keep your cart and your settings. With your permission we also use analytics cookies to see which pages and products people visit, and marketing cookies to measure our ads. You can change your choice at any time.
- **policy:** Cookie Policy
- **accept:** Accept all
- **reject:** Reject all
- **customize:** Customize
- **save:** Save my choices
- **settings:** Cookie settings
- **dialogTitle:** Cookie settings
- **dialogText:** Choose which cookies we may use. Necessary cookies are always on because the shop cannot work without them.
- **alwaysOn:** Always on
- **close:** Close
- **necessary:** Necessary: Your cart, your cookie choice, day or night mode, and bot protection on forms.
- **analytics:** Analytics: A random visit id and the campaign link you came from, so we can see which pages and products are used. Never your name or phone number.
- **marketing:** Marketing: Meta (Facebook) Pixel, to measure our ads. Used only if we run ads.
- **title:** Cookie Policy
- **updated:** Last updated: 1 November 2026
- **intro:** This page explains the cookies and similar browser storage this website uses, why we use them, and how you can control them.
- **whatHeading:** What cookies are
- **what:** Cookies are small text files a website stores in your browser. Browser storage works in a similar way. Necessary ones make the shop work; the others are used only if you agree.
- **tableHeading:** The cookies we use
- **columns:** Name | Type | Set by | Why | How long
- zq_cart | Necessary | Zelqune | Remembers your cart between visits. | 30 days
- zq_consent | Necessary | Zelqune | Remembers your cookie choice. | 6 months
- zq-theme (browser storage) | Necessary | Zelqune | Remembers day or night mode. | Until you clear it
- Cloudflare Turnstile | Necessary | Cloudflare | Checks that forms are sent by a person, not a bot. | Set by Cloudflare
- zq_sid | Analytics | Zelqune | A random visit id, to count which pages and products are viewed. | 12 months
- zq_utm | Analytics | Zelqune | The campaign link you arrived from. | 30 days
- Meta Pixel (for example _fbp) | Marketing | Meta Platforms | Measures our Facebook and Instagram ads; used only if we run ads. | Set by Meta
- **changeHeading:** Changing your choice
- **change:** You can change or withdraw your choice at any time with Cookie settings, here or in the footer. Saying no to analytics deletes those cookies straight away. You can also delete cookies in your browser; the website will then ask again.
- **thirdHeading:** Other services
- **third:** Sample room photos load from Unsplash, which receives your IP address like any web request. Cloudflare provides the bot check on forms. Meta receives data only if you accept marketing cookies.
- **footer link:** Cookie Policy

## Legal pages and form notices

- **updated:** Last updated: 1 November 2026
- **contact:** Questions about this page? Message us on WhatsApp.
- **form notice order:** We use your name, phone and address only to confirm, make and deliver this order.
- **form notice request:** We use these details only to contact you about this request.
- **form notice lookup:** Your code and phone are used only to find your order and are not stored.
- **form notice link:** Privacy Policy

### Privacy Policy

This policy explains what personal information Zelqune collects through this website, why we use it, who receives it, how long we keep it and what you can ask us to do with it.

**Who we are**

- Zelqune makes handcrafted wood and light home decor in Dhaka, Bangladesh, and takes interior design, construction and bulk orders.
- This website is run by [[business name, address and trade licence, to be confirmed]]. You can reach us on WhatsApp (link in the footer).

**What we collect**

- Orders: your name, mobile number, delivery address, payment method, the bKash or Nagad Transaction ID for your advance, and any coupon you use.
- Interior design and construction requests: your name, mobile number, email if you give it, and the project details you describe (type, size, district, budget, start date, notes).
- Bulk and corporate quotes: company name, contact person, mobile number, email, the date you need the order by, and your notes.
- Order and quote tracking: the code and mobile number you type are used to find your order and are not stored.
- Only if you allow analytics cookies: a random visit id, the campaign link you came from, and the pages and products you view. Never your name or phone number. See the Cookie Policy.
- We never ask for card details or your bKash or Nagad PIN. You pay in the bKash or Nagad app; the website only receives the Transaction ID.

**Why we use it**

- To confirm, make and deliver your order, and to check your advance payment.
- To call or message you about your order or request.
- To stop spam and fraud, for example with the bot check on our forms.
- If you allow it, to understand which pages and products are used and which campaigns bring visitors.
- To keep the accounting and tax records the law requires.
- We do not sell your personal information, and we do not send you marketing messages.

**Who receives it**

- The delivery courier receives your name, phone number and address to deliver your order.
- Cloudflare runs the bot check on our forms and receives your IP address and basic browser information.
- Sample photos load from Unsplash, which receives your IP address like any website does.
- Meta (Facebook) receives data only if you accept marketing cookies and we run ads.
- WhatsApp receives only the messages you choose to send us.
- Our website and data are hosted by [[hosting provider and country]].
- We share information with authorities only when the law requires it.

**How long we keep it**

- Order and payment records: [[retention period for order and tax records]].
- Design, construction and bulk requests that do not become an order: [[retention period for requests]].
- Analytics data (no names or phone numbers): [[retention period for analytics]].

**How we protect it**

- The website uses HTTPS. Only staff who need it can see order details, and staff sign in with a password. No system is perfectly secure, but we work to keep your information safe.

**Your choices**

- You can ask us to show you the personal information we hold about you, to correct it, or to delete it. Some order records must be kept for accounting and tax; in that case we remove everything else.
- To ask, message us on WhatsApp from the phone number you used, with your order or quote code, so we know it is you. We aim to reply within [[response time]].
- You can change your cookie choice at any time with Cookie settings in the footer.

**Changes to this policy**

- When we change this policy, we update the date at the top of this page.


### Terms and Conditions

These terms apply when you use this website or order from Zelqune. Please read them before you order.

**About us**

- This website and shop are run by [[business name, address and trade licence, to be confirmed]].

**Products and prices**

- Prices are in Bangladeshi taka (৳). The total you pay, including delivery, is shown at checkout before you order.
- Each piece is handmade from wood, so colour and grain may vary slightly.
- Photos may show sample rooms, and colours on screen can look a little different in real life.

**Orders and payment**

- A pre-order is confirmed once the ৳300 advance is verified.
- If the advance doesn't arrive within 48 hours, the order is cancelled automatically.
- You pay the rest in cash on delivery.
- If we cannot verify your advance or cannot make your order, we cancel it and refund any advance you paid.

**Delivery**

- Pre-orders are made and shipped within 10 days. The courier takes 1–2 days in Dhaka and 2–4 days outside Dhaka.

**Cancellations, returns and refunds**

- If you cancel before production starts, your advance is refunded. Once production has started, the advance is not refundable.
- Returns, damaged items and refunds are covered in our Returns and refunds policy.

**Interior design, construction and bulk orders**

- Sending a request on this website does not create a contract. The price, scope, schedule and payments for these projects are agreed in a separate written quote.

**Using this website**

- The text, photos and designs on this website belong to Zelqune or the people who licensed them to us. Please do not copy them for commercial use without our permission.
- Please do not misuse the website, for example by sending false orders or trying to break its security.

**Law**

- These terms are governed by the laws of Bangladesh.
- When we change these terms, we update the date at the top of this page. The terms in force when you ordered apply to your order.


### Returns, Refunds and Cancellations

How to cancel an order, return an item or get your money back.

**Damaged or defective items**

- Tell us within 24 hours of delivery with a photo or video, and we'll replace it or refund you.

**Returns for change of mind**

- Unused items within 3 days, in the original box; you pay the return delivery.
- Each piece is handmade from wood, so colour and grain may vary slightly. This alone is not a defect.

**Cancelling an order**

- If you cancel before production starts, your advance is refunded. Once production has started, the advance is not refundable.
- If the advance doesn't arrive within 48 hours, the order is cancelled automatically.

**If we are late or cancel**

- If we can't deliver on time, or we cancel your order, we refund the full advance to the same bKash/Nagad number within 7 days.

**How refunds are paid**

- Advances are refunded to the bKash or Nagad number they came from.
- Money paid in cash on delivery is refunded by [[refund method for cash-on-delivery payments]].

**How to ask**

- Message us on WhatsApp with your order code and, for damage, a photo or video.

**Design, construction and bulk orders**

- Cancellations and refunds for these projects follow the written quote you agreed.

- **privacy summary:** Your phone number and address are used only for your order and delivery, never sold. Analytics cookies run only if you allow them. To see, correct or delete your data, message us on WhatsApp.
- **business details pending:** [[business name, address and trade licence, to be confirmed]]
- **business licence label:** Trade licence
- **cookie banner short text:** We use necessary cookies for your cart and settings. With your OK, we also use analytics and ad-measurement cookies.
- **search did you mean:** Did you mean
- **search try instead:** Or try one of these:
- **errorHelp:** This page didn't load because of a problem on our side, not anything you did. Try again; if it keeps happening, message us on WhatsApp and we'll help.
- **errorOffline:** You seem to be offline, so this page couldn't load. Check your internet connection, then try again.
- **network offline:** You're offline. This page stays on screen and your cart is saved on this device. Placing an order or sending a form needs the internet again.
- **network slow:** Your connection looks slow, so we're showing a lighter version of the site: photos instead of videos.
- **network dismiss:** Dismiss
- **cart empty text:** Nothing added yet. Pieces you add stay here on this device, even if you close the page.
- **cart browse:** Browse the shop
- **order placed reassure:** Your order is saved. If anything is unclear, message us on WhatsApp with your order code.
- **order placed next heading:** What happens next
- **order placed next step:** We check your bKash or Nagad advance and confirm your order.
- **order placed next step:** We make your piece. Pre-orders are made and shipped within 10 days.
- **order placed next step:** The courier delivers it, and you pay the rest in cash on delivery.
- **required (checkout error):** This field is needed. Please fill it in.
- **generic (checkout error):** Our server had a problem; it is not your fault. Your details are still here. Try again in a minute, or message us on WhatsApp.
- **outOfStock (checkout error):** This item is out of stock right now. Remove it from your cart or choose another finish.
- **trxUsed (checkout error):** This Transaction ID has already been used. Check the ID in your latest bKash/Nagad message and enter it again.
