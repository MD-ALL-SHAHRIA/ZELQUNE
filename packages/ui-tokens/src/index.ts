/**
 * Zelqune brand tokens (v5): two themes of one brand. "Gallery Ivory" (light, default): espresso
 * text on ivory with antique-brass accents. "Dark Walnut" (dark): ivory text on espresso with
 * champagne brass. Names are kept from v2: "paper" is the page background, "ink" the text,
 * "walnut" the brass accent text. The CSS variables in tokens.css switch between them.
 */
export const colors = {
  /** Brand */
  ink: '#1C1714',
  cream: '#F2ECE2',
  walnut: '#7A5C30',
  amber: '#7A5C30',
  /** Neutrals */
  paper: '#F7F3EC',
  sand: '#EFE8DC',
  stone: '#6B5E52',
  line: '#E2D8C9',
  surface: '#FFFDF9',
  /** Raised surface tint and brass (v3 names kept) */
  sage: '#E9E1D3',
  moss: '#7A5C30',
  /** Glow (lamp light) */
  glow: '#E9B872',
  /** Fixed (never flip): text on photos and overlays, footer */
  ivory: '#F3ECE1',
  espresso: '#14110F',
  night: '#0D0B09',
  brass: '#C9A46A',
  /** Status */
  success: '#2F6B4A',
  warning: '#9A6417',
  danger: '#A3301F',
} as const;

/** The dark theme's values for the colors that change ("Dark Walnut"). */
export const darkColors = {
  ...colors,
  ink: '#F3ECE1',
  cream: '#241E1A',
  walnut: '#C9A46A',
  amber: '#C9A46A',
  paper: '#14110F',
  sand: '#1E1916',
  stone: '#B5A898',
  line: '#3A322B',
  surface: '#1A1613',
  sage: '#2A231E',
  moss: '#C9A46A',
  glow: '#F2C58A',
  success: '#7FB08E',
  warning: '#E0A458',
  danger: '#E07A63',
} as const;

/** Semantic roles; components should use these rather than raw brand names. */
export const semantic = {
  background: colors.paper,
  foreground: colors.ink,
  primary: colors.ink,
  primaryForeground: colors.paper,
  accent: colors.amber,
  accentForeground: colors.ink,
  muted: colors.stone,
  border: colors.line,
  card: colors.surface,
} as const;

/** Display serif (close to the wordmark), clean sans for text; Bangla pairs for both. */
export const typography = {
  fontFamily: {
    display: "'Bodoni Moda', Georgia, serif",
    sans: "'Jost', 'Hind Siliguri', system-ui, sans-serif",
    displayBn: "'Tiro Bangla', 'Bodoni Moda', Georgia, serif",
    sansBn: "'Hind Siliguri', 'Jost', system-ui, sans-serif",
  },
  /** Letter spacing of the wordmark and eyebrow labels. */
  tracking: { wordmark: '0.34em', eyebrow: '0.22em' },
  fontWeight: { light: 300, regular: 400, medium: 500, semibold: 600 },
  /** Bangla script needs more line height than Latin. */
  lineHeight: { bn: 1.75, en: 1.6, display: 1.02, displayBn: 1.26 },
} as const;

/** Square, architectural edges; the arch is the one curved motif. */
export const radius = { none: '0', sm: '2px', arch: '9999px 9999px 0 0', full: '9999px' } as const;

/** 4px grid */
export const spacing = (step: number): string => `${step * 0.25}rem`;

export type ColorToken = keyof typeof colors;
