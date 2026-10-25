# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

Brand v6: **Day** (the default for everyone) and **Night** (only when the visitor picks it with
the storefront's toggle, `data-theme="dark"` on `<html>`), switched by CSS variables
(`tokens.css`). By day nothing is black: soft cream with espresso, and dark bands (`.tone-dark`:
footer, services...) are espresso coffee. Token names are kept from v2: `paper` is the page
background, `ink` the text, `walnut` the brass accent text.

| Token        | Day                   | Day band (`.tone-dark`) | Night                 |
| ------------ | --------------------- | ----------------------- | --------------------- |
| paper        | `#F7F1E8` soft cream  | `#3B2922` espresso      | `#14110F`             |
| ink          | `#3B2922` espresso    | `#F7F1E8`               | `#F3ECE1`             |
| sand / cream | `#EFE6D8` / `#F2EADF` | `#46332B` / `#4A372E`   | `#1E1916` / `#241E1A` |
| stone        | `#75604F`             | `#D9C9B6`               | `#B5A898`             |
| line         | `#E4D8C6`             | `#5A453B`               | `#3A322B`             |
| walnut/amber | `#7A5C30` brass       | `#D9B47A`               | `#C9A46A`             |
| night        | `#3B2922`             | `#3B2922`               | `#0D0B09`             |
| glow         | `#E9B872`             | `#F2C58A`               | `#F2C58A`             |

Fixed: `ivory #F7F1E8` (text on photos), `espresso #3B2922`, `brass` (accents on dark bands).

Tailwind: import both files; `tailwind-theme.css` maps `--color-*` to the variables with
`@theme inline`, so opacity modifiers (`bg-paper/90`) follow the theme.

Fonts (Google Fonts, self-hosted by next/font): **Cormorant Garamond** 400/500/600 (headings at medium weight, the wordmark and the hero, as in the owner's logo) and **Jost** (text); **Hind Siliguri** for Bangla text and **Tiro Bangla** for Bangla display headings (both self-hosted by the storefront, `/bn` only).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```

```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
@import '@zelqune/ui-tokens/tokens.css';
```
