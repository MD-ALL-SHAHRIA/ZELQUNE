'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type Locale } from '@/i18n/config';
import { cn } from '@/shared/lib/cn';

/** Same page in the other language; the URL prefix is the only language switch. */
export function LanguageSwitcher({
  lang,
  labels,
  className,
}: {
  lang: Locale;
  labels: { language: string; english: string; bangla: string };
  className?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const rest = pathname.replace(/^\/(en|bn)(?=\/|$)/, '');
  const link = (target: Locale, label: string) => (
    <Link
      href={`/${target}${rest}${search ? `?${search}` : ''}`}
      hrefLang={target}
      lang={target}
      aria-current={target === lang ? 'true' : undefined}
      className={cn(
        'transition-opacity',
        target === lang ? 'opacity-100' : 'opacity-60 hover:opacity-100',
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label={labels.language}
      className={cn('flex items-center gap-2 text-xs tracking-[0.12em]', className)}
    >
      {link('en', 'EN')}
      <span aria-hidden className="opacity-30">
        /
      </span>
      {link('bn', 'বাং')}
    </nav>
  );
}
