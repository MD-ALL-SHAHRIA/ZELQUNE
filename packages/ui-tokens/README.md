# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

Brand v5: two themes of one brand, switched by CSS variables (`tokens.css`). **Gallery Ivory**
(light, the default) and **Dark Walnut** (dark). Dark applies with `data-theme="dark"` on `<html>`
(the storefront's theme toggle) or by the visitor's system setting until they choose; `.tone-dark`
gives any band the dark values. Token names are kept from v2: `paper` is the page background,
`ink` the text, `walnut` the brass accent text.

| Token        | Light (Gallery Ivory) | Dark (Dark Walnut)    | Role                          |
| ------------ | --------------------- | --------------------- | ----------------------------- |
| paper        | `#F7F3EC`             | `#14110F`             | page background               |
| ink          | `#1C1714`             | `#F3ECE1`             | text, primary buttons         |
| sand / cream | `#EFE8DC` / `#F2ECE2` | `#1E1916` / `#241E1A` | raised surfaces               |
| surface      | `#FFFDF9`             | `#1A1613`             | cards                         |
| stone        | `#6B5E52`             | `#B5A898`             | muted text                    |
| line         | `#E2D8C9`             | `#3A322B`             | hairlines, borders            |
| walnut/amber | `#7A5C30`             | `#C9A46A`             | brass accents (AA as text)    |
| glow         | `#E9B872`             | `#F2C58A`             | lamp light                    |

Fixed in both themes: `ivory #F3ECE1` (text on photos), `espresso #14110F`, `night #0D0B09`
(footer, announcement bar) and `brass #C9A46A` (accents on those dark bands).

Tailwind: import both files; `tailwind-theme.css` maps `--color-*` to the variables with
`@theme inline`, so opacity modifiers (`bg-paper/90`) follow the theme.

Fonts (Google Fonts, self-hosted by next/font): **Bodoni Moda** (display, high-contrast luxury serif with optical sizes) and **Jost** (text); **Hind Siliguri** for Bangla text and **Tiro Bangla** for Bangla display headings (both self-hosted by the storefront, `/bn` only).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```

```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
@import '@zelqune/ui-tokens/tokens.css';
```
