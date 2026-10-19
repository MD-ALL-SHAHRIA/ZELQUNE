import { z } from 'zod';

/**
 * Public env, validated once. NEXT_PUBLIC_* values are inlined at build time, so each is read
 * explicitly (a dynamic process.env lookup would be undefined in the browser).
 */
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3100'),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().regex(/^\d+$/).optional(),
});

const blankToUndefined = (v: string | undefined) => (v ? v : undefined);

export const env = schema.parse({
  NEXT_PUBLIC_API_URL: blankToUndefined(process.env.NEXT_PUBLIC_API_URL),
  NEXT_PUBLIC_SITE_URL: blankToUndefined(process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: blankToUndefined(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  NEXT_PUBLIC_META_PIXEL_ID: blankToUndefined(process.env.NEXT_PUBLIC_META_PIXEL_ID),
});
