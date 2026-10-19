import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { validatePublicEnv } from './src/config/env.schema';

/** Product photos come from catalog-service's media store (R2 in production). */
const mediaBase = new URL(process.env.MEDIA_BASE_URL ?? 'http://localhost:3002/dev-storage');

export default function config(phase: string): NextConfig {
  validatePublicEnv(process.env);
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.ALLOW_TEST_TURNSTILE !== 'true'
  ) {
    throw new Error(
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for a production build ' +
        '(set ALLOW_TEST_TURNSTILE=true only for CI and local e2e builds).',
    );
  }
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    transpilePackages: ['@zelqune/api-client', '@zelqune/ui-tokens'],
    images: {
      loader: 'custom',
      loaderFile: './src/shared/lib/image-loader.ts',
      formats: ['image/webp'],
      remotePatterns: [
        {
          protocol: mediaBase.protocol.replace(':', '') as 'http' | 'https',
          hostname: mediaBase.hostname,
          port: mediaBase.port,
          pathname: `${mediaBase.pathname.replace(/\/$/, '')}/**`,
        },
        // Sample photography until real product photos exist (src/content/sample-images.ts).
        { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/photo-*' },
      ],
    },
  };
}
