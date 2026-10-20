# Bangla web fonts (self-hosted)

Bengali subsets downloaded from Google Fonts, licensed under the SIL Open Font License 1.1
(free to use, bundle and redistribute; licence texts next to the fonts):

- **Hind Siliguri** (400, 600): Bangla body text. Licence: `OFL-hind-siliguri.txt`.
- **Tiro Bangla** (400): Bangla display headings (`.font-display` on `/bn` only).
  Licence: `OFL-tiro-bangla.txt`.

They are self-hosted so `/bn` pages can preload them while `/en` pages never download them
(Bengali `unicode-range` only, and the font stacks switch by `html[lang]`; see
`src/app/[lang]/layout.tsx` and `src/app/globals.css`).
