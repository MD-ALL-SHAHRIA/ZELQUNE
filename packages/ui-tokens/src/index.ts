/**
 * Zelqune brand tokens (v3: deep sage ink on cream, owner's sage + cream palette).
 * "walnut" is now the deep moss accent (name kept for compatibility); amber stays as the small lamp-light accent; "glow" is the warm lamp light used for highlights.
 */
export const colors = {
  /** Brand */
  ink: '#353A30',
  cream: '#EEECDF',
  walnut: '#56664D',
  amber: '#E3A857',
  /** Neutrals */
  paper: '#F5F3E9',
  sand: '#E6E8D8',
  stone: '#5E6457',
  line: '#DAD9C8',
  surface: '#FFFFFF',
  /** Sage (v3 palette: sage green + cream) */
  sage: '#B8C6A5',
  moss: '#64745A',
  /** Glow (lamp light) */
  glow: '#F6C987',
  /** Status */
  success: '#2F6B4A',
  warning: '#9A6417',
  danger: '#A3301F',
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
    display: "'Cormorant Garamond', Georgia, serif",
    sans: "'Jost', 'Hind Siliguri', system-ui, sans-serif",
    displayBn: "'Tiro Bangla', 'Cormorant Garamond', Georgia, serif",
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
