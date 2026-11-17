/**
 * Public URLs, inlined at build time. The localhost fallbacks are for development only; set
 * both variables for any deployed build.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
