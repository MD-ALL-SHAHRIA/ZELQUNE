import Link from 'next/link';
import { Suspense } from 'react';
import { CartDrawer } from '@/features/cart/cart-drawer';
import { cartCopy } from '@/features/cart/cart-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { Logo } from '@/shared/ui/logo';
import { Container } from '@/shared/ui/typography';
import { CartButton, MenuButton, MobileMenu } from './header-actions';
import { LanguageSwitcher } from './language-switcher';
import { primaryNav, secondaryNav } from './nav';

export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const primary = primaryNav(lang, dict);
  const secondary = secondaryNav(lang, dict);
  const link = 'text-[0.78rem] tracking-[0.08em] transition-opacity hover:opacity-55';
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {dict.ui.skip}
      </a>
      <p className="bg-ink px-4 py-2 text-center text-[0.68rem] tracking-[0.16em] text-paper/90 uppercase [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
        {dict.layout.announcement}
      </p>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/88 backdrop-blur-md">
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[4.75rem]">
          <div className="flex items-center gap-8">
            <MenuButton label={dict.layout.menu} />
            <nav aria-label={dict.layout.menu} className="hidden lg:block">
              <ul className="flex gap-8">
                {primary.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={link}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <Link href={href(lang)} aria-label={dict.brand.name} className="justify-self-center">
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-6">
            <ul className="hidden gap-8 lg:flex">
              {secondary.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Suspense fallback={null}>
              <LanguageSwitcher lang={lang} labels={dict.ui} className="hidden sm:flex" />
            </Suspense>
            <CartButton lang={lang} label={dict.cart.title} />
          </div>
        </Container>
      </header>
      <MobileMenu
        title={dict.layout.menu}
        closeLabel={dict.layout.closeMenu}
        links={[{ href: href(lang), label: dict.nav.home }, ...primary, ...secondary]}
        footer={
          <Suspense fallback={null}>
            <LanguageSwitcher lang={lang} labels={dict.ui} className="text-sm" />
          </Suspense>
        }
      />
      <CartDrawer lang={lang} copy={cartCopy(dict)} />
    </>
  );
}
