# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

Brand v2 follows the owner's logo: near-black ink on warm cream, walnut and amber as accents.

| Token | Hex | Role |
|---|---|---|
| ink | `#16120F` | text, primary buttons, the logo |
| paper | `#FAF6EF` | page background |
| cream | `#F2EADB` | logo background, sections |
| walnut | `#4A3426` | wood accent |
| amber / glow | `#E3A857` / `#F6C987` | warm lamp light, highlights |

Fonts (Google Fonts, self-hosted by next/font): **Cormorant Garamond** (display, close to the
wordmark) and **Manrope** (text); **Hind Siliguri** for Bangla (self-hosted by the storefront).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```
```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
```
