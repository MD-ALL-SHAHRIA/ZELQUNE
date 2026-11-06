# Zelqune promo video (Remotion)

A 59 s story ad ("Switch on the warmth") built from real storefront captures. See PRODUCT_BRIEF.md and SCRIPT.md.

## Commands (from video/)
- `pnpm capture`: re-capture the storefront (needs the dev stack and `pnpm --filter @zelqune/frontend dev` on :3100). Saves 2x screenshots, product cards and scroll recordings to assets/screens/.
- `pnpm studio`: open Remotion Studio (compositions Reels-9x16, Feed-4x5, Web-16x9, Thumbnail).
- `pnpm render`: render the three H.264 MP4s and the 1080 thumbnail into out/.
- `node scripts/render.mjs stills 45 500 1340`: review stills of all formats into out/stills/.

## What to tweak
Everything is in src/video.config.ts: `copy` (all text), `colors`, `scenes` (start/length in beats of the 120 BPM grid), `springs`, `screens` and `audio`.

## Audio
Drop `assets/music.mp3` (120 BPM), `assets/sfx/whoosh.mp3` and `assets/sfx/click.mp3`; they are picked up automatically (whoosh on every cut, click on cursor clicks). No audio is committed.
