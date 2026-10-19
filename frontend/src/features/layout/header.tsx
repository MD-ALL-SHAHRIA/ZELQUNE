import Link from 'next/link';
import { Suspense } from 'react';
import { cartCopy } from '@/features/cart/cart-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Logo } from '@/shared/ui/logo';
import { Container } from '@/shared/ui/typography';
import { CartButton, MenuButton } from './header-actions';
import { LanguageSwitcher } from './language-switcher';
import { categoryLinks, primaryNav, secondaryNav } from './nav';
import { Overlays } from './overlays';

export function Header({
  lang,
  dict,
  categories,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  const primary = primaryNav(lang, dict);
  const cats = categoryLinks(lang, categories);
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
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/95">
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[4.75rem]">
          <div className="flex items-center gap-8">
            <MenuButton label={dict.layout.menu} />
            <nav aria-label={dict.layout.menu} className="hidden lg:block">
              <ul className="flex gap-7">
                <li className="group relative">
                  <Link href={primary.shop.href} className={link} aria-haspopup="true">
                    {primary.shop.label}
                  </Link>
                  {/* CSS-only dropdown: opens on hover and on keyboard focus. */}
                  <div className="invisible absolute left-0 top-full z-40 pt-5 opacity-0 transition duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="min-w-60 border border-line bg-paper p-6 shadow-[0_20px_50px_rgba(22,18,15,0.08)]">
                      <p className="mb-3 text-[0.68rem] uppercase tracking-eyebrow text-stone">
                        {dict.nav2.byCategory}
                      </p>
                      <ul className="space-y-2">
                        {cats.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              className="font-display text-xl font-light hover:opacity-60"
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                        <li className="border-t border-line pt-3">
                          <Link
                            href={primary.shop.href}
                            className="text-sm underline-offset-4 hover:underline"
                          >
                            {dict.nav2.allProducts}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </li>
                {primary.rest.map((l) => (
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
      <Overlays
        lang={lang}
        cartCopy={cartCopy(dict)}
        menu={{
          title: dict.layout.menu,
          closeLabel: dict.layout.closeMenu,
          links: [
            { href: href(lang), label: dict.nav.home },
            primary.shop,
            ...cats,
            ...primary.rest,
            ...secondary,
          ],
          footer: (
            <Suspense fallback={null}>
              <LanguageSwitcher lang={lang} labels={dict.ui} className="text-sm" />
            </Suspense>
          ),
        }}
      />
    </>
  );
}
