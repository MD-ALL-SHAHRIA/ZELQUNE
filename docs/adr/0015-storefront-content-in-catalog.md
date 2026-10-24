# 0015. Storefront content lives in catalog-service as versioned documents

- Status: Accepted
- Date: 2026-10-24

## Context
The owner wants to change the home page (hero scenes, trust strip, collections order, the
announcement bar, contact and social links) from the admin dashboard instead of through code and
the copy docs. The build plan lists a CMS for M2. The content is small, read on every home-page
render, written rarely by OWNER/STAFF, and its images need the same presigned-upload flow product
media already uses (ADR 0007).

## Decision
- Content is stored in **catalog-service** (its own `catalog` schema), not in a new service:
  `site_content` holds one JSON document per key (`home` for now) with a `version`, and
  `content_assets` holds uploaded images (PENDING → READY, same storage provider and verification
  as product media, keys under `content/`).
- The document shape is one zod schema in `libs/contracts` (`homeContentSchema`); every text is
  English + Bangla. It is validated on every write.
- Writes use optimistic concurrency (`expectedVersion`; 409 `CONTENT_VERSION_CONFLICT`), refuse
  images that are not READY (422), and are audited (`content.update`, `contentAsset.*`). No domain
  event is published: no other service reacts to content.
- Gateway: public `GET /v1/content/home` (`{ home: null }` until the first save) and OWNER/STAFF
  `GET|PUT /v1/admin/content/home`, `POST /v1/admin/content/assets/uploads`,
  `POST /v1/admin/content/assets/:id/confirm`.
- The storefront reads it with ISR and falls back to the copy docs while `home` is null or a field
  is empty, so the site never depends on content having been entered.

## Consequences
- No new container, port, database schema or deployment unit; content shares catalog's storage
  and audit plumbing.
- A whole-document save is simple for the dashboard (one form) but two editors can conflict;
  the version check turns that into a clear "reload and try again".
- If content grows (blog, pages, many locales), move it to its own content-service; the
  contracts and gateway routes stay the same.
