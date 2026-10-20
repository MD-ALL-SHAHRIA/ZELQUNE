/**
 * Public env for server and browser code. Validated once in next.config (env.schema.ts);
 * this module stays dependency-free so it adds nothing to the client bundle. NEXT_PUBLIC_*
 * values are inlined at build time, so each is read explicitly.
 */
const blankToUndefined = (v: string | undefined) => (v ? v : undefined);

export const env = {
  NEXT_PUBLIC_API_URL: blankToUndefined(process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:3000',
  NEXT_PUBLIC_SITE_URL:
    blankToUndefined(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3100',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: blankToUndefined(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  NEXT_PUBLIC_META_PIXEL_ID: blankToUndefined(process.env.NEXT_PUBLIC_META_PIXEL_ID),
} as const;
