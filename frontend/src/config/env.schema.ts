import { z } from 'zod';

/**
 * Public env contract, validated on the server when next.config loads (build and start), so a
 * bad value fails fast without shipping zod to the browser.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().regex(/^\d+$/, 'Meta Pixel IDs are digits only').optional(),
});

const blankToUndefined = (v: string | undefined) => (v ? v : undefined);

export function validatePublicEnv(source: Record<string, string | undefined>): void {
  publicEnvSchema.parse({
    NEXT_PUBLIC_API_URL: blankToUndefined(source.NEXT_PUBLIC_API_URL),
    NEXT_PUBLIC_SITE_URL: blankToUndefined(source.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: blankToUndefined(source.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    NEXT_PUBLIC_META_PIXEL_ID: blankToUndefined(source.NEXT_PUBLIC_META_PIXEL_ID),
  });
}
