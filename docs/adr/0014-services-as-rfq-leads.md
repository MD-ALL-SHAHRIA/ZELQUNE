# 0014. Interior design and construction requests are RFQ leads

- Status: Accepted
- Date: 2026-10-20

## Context
Besides selling its own products, Zelqune offers services in the manner of RH Interior Design
and RH Contract: interior design for homes, offices, restaurants, cafés, hotels and shops, and
construction from the ground up to finished interiors. The owner wants clients to request these
from the website now; how design and construction fees are quoted and invoiced is not decided.

## Decision
- **One request pipeline.** The public RFQ (`POST /v1/quote-requests`, ADR 0011) gains a `kind`:
  `PRODUCT` (unchanged: bulk order, priced into a B2B order), `DESIGN` and `CONSTRUCTION`.
- **Brief instead of items.** Service requests carry a brief: space or building type
  (`HOME | OFFICE | RESTAURANT_CAFE | HOTEL | RETAIL | OTHER`), area in sq ft, district, budget
  band and, for construction only, the number of floors. They need no company name or items.
  Budget bands cover interiors (under 1 lakh to above 15 lakh) and buildings (under 50 lakh to
  above 3 crore). Validated in the contract and by database CHECKs per kind.
- **Leads, not quotes (for now).** Service requests get a tracking code, appear in the admin
  quote list (`?kind=DESIGN|CONSTRUCTION`) and alert the owner by SMS naming the space. They
  are never priced or converted through the product-quote flow
  (`422 DESIGN_REQUEST_NOT_PRICEABLE`); fees are agreed and invoiced outside the system.
- **Event evolution (ADR 0010).** `quote.requested` v1 gains optional `kind` and `spaceType`;
  `organizationName` may be null.
- **No invented credibility.** Service pages show no fake projects, reviews or client logos;
  project galleries stay visible `[[...]]` placeholders until real work exists.

## Consequences
- The admin dashboard (step 1.5) shows leads and products in one list, filtered by kind.
- A later milestone can add priced design/construction proposals (milestones, stage payments)
  without changing how requests are captured.
