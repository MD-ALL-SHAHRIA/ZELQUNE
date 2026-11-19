import path from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import { validatePublicEnv } from './src/config/env.schema';

/** Product photos come from catalog-service's media store (R2 in production). */
const mediaBase = new URL(process.env.MEDIA_BASE_URL ?? 'http://localhost:3002/dev-storage');

const origin = (value: string | undefined, fallback: string) => {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
};

/**
 * Security headers for every page. The CSP allows only what the site uses: the gateway API,
 * product media, Unsplash samples, Cloudflare Turnstile and (when configured) the Meta Pixel.
 * Inline scripts stay allowed: the no-flash theme script and Next's own bootstrap are inline,
 * and nonces would force every page to render dynamically (no ISR).
 */
function securityHeaders(dev: boolean) {
  const api = origin(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:3000');
  const site = origin(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3100');
  // Dev only: localhost:8400 is the Impeccable live-mode picker (never in production builds).
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval' http://localhost:8400" : ''} https://challenges.cloudflare.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${mediaBase.origin} https://images.unsplash.com https://www.facebook.com`,
    "font-src 'self' data:",
    // The construction film is read into memory (blob:) so the scroll can seek it smoothly.
    `media-src 'self' blob: ${mediaBase.origin}`,
    `connect-src 'self' ${api} https://www.facebook.com https://connect.facebook.net${dev ? ' ws: wss: http://localhost:8400' : ''}`,
    'frame-src https://challenges.cloudflare.com https://www.facebook.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(site.startsWith('https:') ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
    ...(site.startsWith('https:')
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]
      : []),
  ];
}

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
    // Docker images (infra/docker/web.Dockerfile) set NEXT_OUTPUT=standalone; `next start` stays as is.
    output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
    outputFileTracingRoot: path.join(__dirname, '..'),
    async headers() {
      // Files in public/ keep their names when replaced, so not "immutable": browsers keep them
      // a week and refresh quietly in the background for a month after that (no round trip per
      // photo on repeat visits).
      const publicCache = [
        {
          key: 'Cache-Control',
          value: 'public, max-age=604800, stale-while-revalidate=2592000',
        },
      ];
      return [
        { source: '/:path*', headers: securityHeaders(phase === PHASE_DEVELOPMENT_SERVER) },
        ...['images', 'videos', 'fonts', 'email'].map((dir) => ({
          source: `/${dir}/:path*`,
          headers: publicCache,
        })),
      ];
    },
    transpilePackages: ['@zelqune/api-client', '@zelqune/ui-tokens'],
    // Next's optimizer resizes every photo (uploads, samples) to the width each screen needs,
    // as AVIF or WebP, and caches the result (.next/cache/images, a volume in production).
    images: {
      formats: ['image/avif', 'image/webp'],
      qualities: [60, 75, 80],
      // Upload URLs never change content (a new photo gets a new key), so cache for 30 days.
      minimumCacheTTL: 60 * 60 * 24 * 30,
      // Development and e2e read the media store on localhost.
      dangerouslyAllowLocalIP: ['localhost', '127.0.0.1'].includes(mediaBase.hostname),
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
