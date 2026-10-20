import Link from 'next/link';
import { Suspense } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/lib/site';
import { LanguageSwitcher } from './language-switcher';

export function navLinks(lang: Locale, dict: Dictionary) {
  return [
    { href: href(lang), label: dict.nav.home },
    { href: href(lang, '/shop'), label: dict.nav.shop },
    { href: href(lang, '/bulk'), label: dict.nav.bulk },
    { href: href(lang, '/track'), label: dict.nav.track },
    { href: href(lang, '/faq'), label: dict.nav.faq },
  ];
}

export function Header({
  lang,
  dict,
  cart,
}: {
  lang: Locale;
  dict: Dictionary;
  cart?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:p-2"
      >
        {dict.ui.skip}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={href(lang)} className="text-xl font-semibold tracking-wide text-walnut">
          {dict.brand.name}
        </Link>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher lang={lang} labels={dict.ui} />
          </Suspense>
          {cart}
        </div>
      </div>
      <nav aria-label={dict.nav.home} className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2">
        <ul className="flex gap-4 whitespace-nowrap text-sm">
          {navLinks(lang, dict).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="inline-block py-1 text-ink hover:text-walnut">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
