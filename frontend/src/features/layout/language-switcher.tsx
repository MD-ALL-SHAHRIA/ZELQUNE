'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type Locale } from '@/i18n/config';

/** Same page in the other language; the URL prefix is the only language switch. */
export function LanguageSwitcher({
  lang,
  labels,
}: {
  lang: Locale;
  labels: { language: string; english: string; bangla: string };
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target: Locale = lang === 'en' ? 'bn' : 'en';
  const rest = pathname.replace(/^\/(en|bn)(?=\/|$)/, '');
  return (
    <Link
      href={`/${target}${rest}${search ? `?${search}` : ''}`}
      hrefLang={target}
      lang={target}
      aria-label={labels.language}
      className="rounded-md border border-line px-2.5 py-1 text-sm hover:bg-surface"
    >
      {target === 'bn' ? labels.bangla : labels.english}
    </Link>
  );
}
