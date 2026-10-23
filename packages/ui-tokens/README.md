# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

Brand v3 (owner's sage + cream palette): deep sage ink on cream, with the warm amber lamp light
kept as a small accent so the lit-wood product photos still feel at home.

| Token        | Hex                   | Role                                         |
| ------------ | --------------------- | -------------------------------------------- |
| ink          | `#353A30`             | text, primary buttons, dark sections, logo   |
| paper        | `#F5F3E9`             | page background                              |
| cream        | `#EEECDF`             | text on dark, light sections                 |
| sand         | `#E6E8D8`             | sage-tinted surfaces                         |
| sage         | `#B8C6A5`             | soft fills, chips, hover                     |
| moss         | `#64745A`             | decorative fills, rules (not small text)     |
| walnut       | `#56664D`             | deep moss accent text (AA on paper and sand) |
| amber / glow | `#E3A857` / `#F6C987` | warm lamp light, small highlights            |

Fonts (Google Fonts, self-hosted by next/font): **Cormorant Garamond** (display, close to the
wordmark) and **Jost** (text); **Hind Siliguri** for Bangla text and **Tiro Bangla** for Bangla display headings (both self-hosted by the storefront, `/bn` only).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```

```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
```
