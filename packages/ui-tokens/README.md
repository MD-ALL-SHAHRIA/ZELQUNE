# @zelqune/ui-tokens

Single source for brand colors, typography and spacing, used by `frontend/` and `dashboard/`.

| Token | Hex | Role |
|---|---|---|
| walnut | `#4A3426` | primary, headings |
| cream | `#F4ECDF` | page background |
| amber | `#E3A857` | accent, warm light |

Neutrals and status colors are derived proposals. Fonts are placeholders: **Hind Siliguri**
(Bangla) and **Inter** (Latin).

```ts
import { colors, typography } from '@zelqune/ui-tokens';
```
```css
@import 'tailwindcss';
@import '@zelqune/ui-tokens/tailwind-theme.css';
```
