/**
 * Zelqune brand tokens (v2, from the owner's logo: near-black ink on warm cream).
 * Walnut and amber are accents; "glow" is the warm lamp light used for highlights.
 */
export const colors = {
  /** Brand */
  ink: '#16120F',
  cream: '#F2EADB',
  walnut: '#4A3426',
  amber: '#E3A857',
  /** Neutrals */
  paper: '#FAF6EF',
  sand: '#EDE3D3',
  stone: '#6A5E51',
  line: '#E2D7C6',
  surface: '#FFFFFF',
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
    sans: "'Manrope', 'Hind Siliguri', system-ui, sans-serif",
    displayBn: "'Tiro Bangla', 'Cormorant Garamond', Georgia, serif",
    sansBn: "'Hind Siliguri', 'Manrope', system-ui, sans-serif",
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
