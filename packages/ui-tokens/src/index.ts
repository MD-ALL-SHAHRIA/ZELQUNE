/**
 * Zelqune brand tokens. Brand colors come from the build plan; everything marked
 * "derived" is a proposal to confirm with the final brand guide.
 */
export const colors = {
  /** Brand */
  walnut: '#4A3426',
  cream: '#F4ECDF',
  amber: '#E3A857',
  /** Derived neutrals */
  ink: '#2A1E16',
  muted: '#7A6A5D',
  line: '#E3D6C4',
  surface: '#FFFFFF',
  /** Derived status */
  success: '#2F7D4F',
  warning: '#B7791F',
  danger: '#B3261E',
} as const;

/** Semantic roles; components should use these rather than raw brand names. */
export const semantic = {
  background: colors.cream,
  foreground: colors.ink,
  primary: colors.walnut,
  primaryForeground: colors.cream,
  accent: colors.amber,
  accentForeground: colors.ink,
  muted: colors.muted,
  border: colors.line,
  card: colors.surface,
} as const;

/** Placeholder fonts (Google Fonts): Hind Siliguri for Bangla, Inter for Latin. */
export const typography = {
  fontFamily: {
    bn: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
    en: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  /** rem, mobile-first */
  fontSize: {
    xs: 0.75,
    sm: 0.875,
    base: 1,
    lg: 1.125,
    xl: 1.25,
    '2xl': 1.5,
    '3xl': 1.875,
    '4xl': 2.25,
  },
  fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  /** Bangla script needs more line height than Latin. */
  lineHeight: { bn: 1.7, en: 1.5, heading: 1.25 },
} as const;

export const radius = { sm: '4px', md: '8px', lg: '12px', full: '9999px' } as const;

/** 4px grid */
export const spacing = (step: number): string => `${step * 0.25}rem`;

export type ColorToken = keyof typeof colors;
