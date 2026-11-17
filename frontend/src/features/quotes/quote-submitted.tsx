'use client';

import { useEffect, useRef } from 'react';
import { type Locale } from '@/i18n/config';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';

/**
 * Shown after a quote request is sent: the request code inside the thank-you line and a link to
 * track it. The panel is shorter than the form it replaces, so it scrolls into view and takes
 * focus.
 */
export function QuoteSubmitted({
  lang,
  code,
  text,
  trackLabel,
  testId,
}: {
  lang: Locale;
  code: string;
  /** Thank-you line with a `{code}` placeholder. */
  text: string;
  trackLabel: string;
  testId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' });
    ref.current?.focus({ preventScroll: true });
  }, []);

  const [before, after] = text.split('{code}');
  return (
    <div ref={ref} tabIndex={-1} role="status" className="space-y-8 outline-none">
      <p className="font-display text-3xl font-medium leading-snug">
        <CopyText>{before ?? ''}</CopyText>
        <strong
          data-testid={testId}
          className="mx-1 inline-block border border-ink px-3 py-1 font-mono text-lg font-normal tracking-[0.16em]"
        >
          {code}
        </strong>
        <CopyText>{after ?? ''}</CopyText>
      </p>
      <ButtonLink href={`${href(lang, '/bulk/track')}?code=${code}`} size="lg">
        {trackLabel}
      </ButtonLink>
    </div>
  );
}
