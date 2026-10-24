'use client';

import { useEffect } from 'react';
import { ERROR_COPY } from '@/i18n/error-copy';

/**
 * Last resort when the root layout itself fails: its own document, no app styles, so it is
 * styled inline in the brand's day colours and speaks both languages.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? '', error);
  }, [error]);
  const button = {
    border: '1px solid #3b2922',
    padding: '14px 28px',
    font: 'inherit',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    fontSize: 12,
    cursor: 'pointer',
  };
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          background: '#f7f1e8',
          color: '#3b2922',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <title>Zelqune</title>
        <main>
          <p style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontSize: 14 }}>
            Zelqune
          </p>
          <h1 style={{ fontWeight: 500, fontSize: 30, maxWidth: 560 }}>{ERROR_COPY.en.error}</h1>
          <p lang="bn" style={{ fontSize: 20, opacity: 0.75 }}>
            {ERROR_COPY.bn.error}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ ...button, background: '#3b2922', color: '#f7f1e8' }}
            >
              {ERROR_COPY.en.tryAgain}
            </button>
            {/* A plain link on purpose: the app's router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/en"
              style={{
                ...button,
                background: 'transparent',
                color: '#3b2922',
                textDecoration: 'none',
              }}
            >
              {ERROR_COPY.en.backHome}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
