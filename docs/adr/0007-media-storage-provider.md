# 0007. Product media through a StorageProvider (R2 in production, local fake in dev)

- Status: Accepted
- Date: 2026-10-19

## Context
Product photos must load fast on mobile (spec: WebP, < 200 KB) and should not pass through our
VPS. Cloudflare R2 has no egress fees and an S3-compatible API, but no account exists yet, and dev
and CI must work offline.

## Decision
- `StorageProvider` interface (`createUploadUrl`, `head`, `publicUrl`) in catalog-service.
- **R2StorageProvider** (production): presigned `PUT` via `@aws-sdk/client-s3`, signing
  `Content-Type` and `Content-Length`; public reads from the bucket's public URL/CDN.
- **LocalStorageProvider** (dev/tests): HMAC-signed `PUT` URLs served by catalog-service at
  `/dev-storage/media/:file`, files on disk, same request/confirm flow. Disabled (404) with R2.
- Flow: request upload → `Media` row `PENDING` + upload URL → client PUTs the file → confirm →
  service checks the object exists with the declared size and type → `READY`. **Only READY media
  is ever returned publicly.** Allowed: WebP, JPEG, PNG, AVIF, ≤ 10 MB.

## Consequences
- Switching to R2 is configuration only (`STORAGE_DRIVER=r2` + `R2_*`), after the owner approves
  the account.
- Abandoned PENDING uploads accumulate; a cleanup job comes with the admin media UI (step 1.3/1.5).
- Image resizing/WebP conversion is not done server-side yet; uploads should be optimised
  beforehand (or use Cloudflare Images later).
