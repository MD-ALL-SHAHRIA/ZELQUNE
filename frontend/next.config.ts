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
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${mediaBase.origin} https://images.unsplash.com https://www.facebook.com`,
    "font-src 'self' data:",
    // The construction film is read into memory (blob:) so the scroll can seek it smoothly.
    `media-src 'self' blob: ${mediaBase.origin}`,
    `connect-src 'self' ${api} https://www.facebook.com https://connect.facebook.net${dev ? ' ws: wss:' : ''}`,
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
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders(phase === PHASE_DEVELOPMENT_SERVER) }];
    },
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
