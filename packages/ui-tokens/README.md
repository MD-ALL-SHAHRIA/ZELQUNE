# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

Brand v4, dark walnut luxury (owner's choice): ivory text on deep espresso, champagne-brass
details and the warm lamp glow, so the lit wood pieces read like a showroom at night. Token names
are kept from v2: `paper` is the page background, `ink` the text.

| Token        | Hex                   | Role                                            |
| ------------ | --------------------- | ----------------------------------------------- |
| paper        | `#14110F`             | page background (espresso)                      |
| ink          | `#F3ECE1`             | text, primary buttons, the one light band       |
| sand / cream | `#1E1916` / `#241E1A` | raised surfaces (walnut shadow)                 |
| stone        | `#B5A898`             | muted text                                      |
| line         | `#3A322B`             | hairlines, borders                              |
| walnut/amber | `#C9A46A`             | champagne brass accents                         |
| glow         | `#F2C58A`             | lamp light                                      |
| ivory        | `#F3ECE1`             | fixed: text on photos and overlays (never flips)|
| espresso     | `#14110F`             | fixed dark                                      |
| night        | `#0D0B09`             | footer and the announcement bar                 |

Fonts (Google Fonts, self-hosted by next/font): **Bodoni Moda** (display, high-contrast luxury serif with optical sizes) and **Jost** (text); **Hind Siliguri** for Bangla text and **Tiro Bangla** for Bangla display headings (both self-hosted by the storefront, `/bn` only).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```

```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
```
