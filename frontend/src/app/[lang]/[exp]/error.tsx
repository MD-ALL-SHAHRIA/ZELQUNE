'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ERROR_COPY } from '@/i18n/error-copy';
import { Button, ButtonLink } from '@/shared/ui/button';
import { Container } from '@/shared/ui/typography';

/**
 * A page failed to render (the header and footer still show). The visitor can retry or go home;
 * the error is logged with its digest so it can be found in the server logs.
 */
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const params = useParams<{ lang?: string }>();
  const lang = params.lang === 'bn' ? 'bn' : 'en';
  const copy = ERROR_COPY[lang];
  useEffect(() => {
    console.error('[page-error]', error.digest ?? '', error);
  }, [error]);
  return (
    <section className="glow relative overflow-hidden border-b border-line">
      <Container className="grid min-h-[60svh] place-items-center py-20 text-center">
        <div className="flex max-w-xl flex-col items-center">
          <div
            aria-hidden
            className="h-40 w-28 rounded-t-full border border-ink/25 sm:h-48 sm:w-32"
          />
          <h1 className="mt-10 font-display text-[clamp(1.9rem,1.5rem+1.8vw,2.8rem)] font-medium leading-[1.1] text-balance">
            {copy.error}
          </h1>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-stone">
            {typeof navigator !== 'undefined' && !navigator.onLine
              ? copy.errorOffline
              : copy.errorHelp}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button onClick={() => retry()}>{copy.tryAgain}</Button>
            <ButtonLink href={`/${lang}`} variant="outline">
              {copy.backHome}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
