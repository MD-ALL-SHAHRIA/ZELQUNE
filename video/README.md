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
- `python3 scripts/compose_audio.py`: composes the original soundtrack (120 BPM, D major, felt piano + strings) and the SFX library in assets/sfx (keystrokes, click, toggle, pop, tick, chime, shimmer, whooshes, riser, impact). Needs numpy, scipy, ffmpeg. Re-run after changing scene timings.
- Sounds are cued in src/audio/cues.ts from the same `timing` values the animations use (src/video.config.ts), so moving an animation moves its sound. Helpers: `<SFX name at />`, `<TypingSound text startFrame />`, `<Soundtrack />`.
- `node scripts/cues.mjs`: writes SOUND_CUES.md (time, sound, visual event). `python3 scripts/bpm.py`: checks the music tempo and beat alignment.
- Rendering masters each video to -14 LUFS / -1 dBTP (two-pass loudnorm), AAC 320 kbps.
- Mix levels: `audio` in video.config.ts (music volume, duck amount, fades, SFX volume).
