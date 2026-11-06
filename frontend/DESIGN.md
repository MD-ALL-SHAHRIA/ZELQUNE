---
name: Zelqune
description: Handcrafted wood and warm light, made to order in Dhaka.
colors:
  espresso: "#3b2922"
  paper: "#f7f1e8"
  cream: "#ece0ce"
  sand: "#e9dcc8"
  walnut: "#7a5c30"
  brass: "#d9b47a"
  glow: "#e9b872"
  stone: "#69543f"
  line: "#d9cab3"
  surface: "#fffbf5"
  sale: "#963726"
  success: "#2f6b4a"
  warning: "#9a6417"
  danger: "#a3301f"
  night-paper: "#14110f"
  night-ink: "#f3ece1"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3.6rem, 15vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.4rem"
    fontWeight: 500
    lineHeight: 1.15
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 500
    letterSpacing: "0.18em"
  wordmark:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    letterSpacing: "0.34em"
rounded:
  none: "0px"
  arch: "999px 999px 0 0"
  pill: "9999px"
spacing:
  gutter-phone: "20px"
  gutter-desktop: "40px"
  container: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 28px"
  button-primary-hover:
    backgroundColor: "{colors.walnut}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.espresso}"
    rounded: "{rounded.none}"
    height: "48px"
  input:
    textColor: "{colors.espresso}"
    rounded: "{rounded.none}"
    height: "48px"
---

# Design System: Zelqune

## Overview

**Creative North Star: "The Lamplit Workshop"**

Espresso and cream, like walnut in warm lamplight. The storefront is quiet and crafted. Large
photographs of lit pieces carry the page, Cormorant Garamond sets the voice, and Jost keeps the
small print clear. Day (cream ground) is the default. Night is the visitor's choice. Dark bands
(`tone-dark`) are espresso coffee, never black. The look is binding: refinement keeps it exactly
(PRODUCT.md, Brand Commitments).

**Key Characteristics:**
- Square corners everywhere. The arch (round top, straight sides) is the one curve.
- Hairlines (`line`) and tone shifts instead of cards and heavy shadows.
- Uppercase, tracked Jost labels in English. Bangla is never letter-spaced or uppercased.
- Motion is slow and soft (`cubic-bezier(.22,1,.36,1)`), and none with reduced motion.

## Colors

Warm, low-saturation browns with one warm brass accent. Tokens live in `packages/ui-tokens`
and flip per theme. Use the semantic name, never the hex.

### Primary
- **Espresso Ink** (#3b2922): text, primary buttons, dark bands.
- **Walnut** (#7a5c30): primary-button hover fill, icons, accents on light ground.

### Secondary
- **Brass / Glow** (#d9b47a / #e9b872): accents on dark bands and photos only (the gold "Light").

### Neutral
- **Paper** (#f7f1e8): page ground. **Cream** (#ece0ce) and **Sand** (#e9dcc8): calm panels.
- **Stone** (#69543f): secondary text. **Line** (#d9cab3): hairlines and dividers.
- **Ivory** (#f7f1e8): text on photos and dark bands (fixed in both themes).

### Named Rules
**The Coffee Not Black Rule.** Dark bands use espresso by day and deep walnut by night. Never pure black.
**The AA Rule.** Small text on cream or sand uses `ink/80` or stronger. Faded ink below about 75% fails AA there.

## Typography

**Display Font:** Cormorant Garamond (the logo's face), with Georgia as fallback.
**Body Font:** Jost, with system-ui as fallback. **Bangla:** Hind Siliguri (text) and Tiro Bangla (display, loaded late).

**Character:** an engraved, calm serif for voice, and a clean geometric sans for facts and actions.

### Hierarchy
- **Display** (400, `clamp(3.6rem,15vw,6rem)` up to 12.5rem on desktop, 0.9): the hero words.
- **Headline** (500, about 2.4rem, 1.15): page and section titles.
- **Body** (400, 1rem, 1.6): copy, about 65ch.
- **Label** (500, 0.74rem, 0.18–0.22em, uppercase in English): buttons, eyebrows, form labels.

## Layout

Container 1440px, gutters 20px (phone) and 40px (md+). Mobile-first. No sideways scroll on
phones. Generous vertical rhythm (sections `py-20` to `py-36`). Product grids are two-up on phones.

## Elevation & Depth

Mostly flat with tonal layering. Shadows are soft, warm and long, for floating layers (cookie
card, dialogs, hover lift on product cards), e.g. `0 30px 80px -40px rgba(43,30,25,.18)`.

## Shapes

Square by default. The arch (`rounded-t-full`) frames feature photos. Pills only for small
controls (the hero's slide pill, swatches).

## Components

- **Buttons:** square, uppercase tracked label. Primary is an ink block whose walnut fill sweeps in
  on hover. Outline and light are hairline boxes. Link variants redraw an underline.
- **Inputs:** underline fields with uppercase tracked labels, an error line below in `danger`.
- **Product card:** a 4:5 photo on sand that lifts slightly on hover with a warm glow. Name in serif, price in Jost.

## Do's and Don'ts

- Do use semantic tokens (`text-ink`, `bg-cream`, `tone-dark`). Don't hard-code hex values in components.
- Do keep corners square. Don't add rounded cards or rounded buttons.
- Don't letter-space or uppercase Bangla text.
- Don't invent reviews, ratings, sold counts, scarcity or countdowns.
