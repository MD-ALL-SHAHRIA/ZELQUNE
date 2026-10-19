# Bangla web fonts (self-hosted)

Bengali subsets of **Hind Siliguri** (400, 600), downloaded from Google Fonts, used for Bangla text
and headings. Licensed under the SIL Open Font License 1.1 (free to use, bundle and
redistribute). They are self-hosted so `/bn` pages can preload them while `/en` pages never
download them (see `src/app/[lang]/layout.tsx` and `src/app/globals.css`).
