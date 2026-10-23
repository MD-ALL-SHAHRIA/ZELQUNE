import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { cartCopy } from '@/features/cart/cart-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { CopyText } from '@/shared/ui/copy-text';
import { href } from '@/shared/lib/site';
import { Logo } from '@/shared/ui/logo';
import { CartButton, MenuButton } from './header-actions';
import { iconButton } from './header-styles';
import { LanguageSwitcher } from './language-switcher';
import { categoryLinks, helpNav, serviceNav, shopNav } from './nav';
import { ActiveLink, NavTabs } from './nav-tabs';
import { type SearchIndex } from './search';
import { SearchButton } from './search-button';
import { Overlays } from './overlays';

/**
 * Two-row header in the RH manner: utilities around a centred logo, then the catalog as tabs.
 * Server-rendered; only the small buttons, the active-tab marker and the language switch are
 * client components. Search, menu and cart overlays load on first open.
 */
export function Header({
  lang,
  dict,
  categories,
  searchIndex,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  searchIndex: SearchIndex;
}) {
  const cats = categoryLinks(lang, categories);
  const services = serviceNav(lang, dict);
  const shop = shopNav(lang, dict);
  const help = helpNav(lang, dict);
  const account = href(lang, '/account');
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-night px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {dict.ui.skip}
      </a>
      <p className="tone-dark bg-night px-4 py-[0.7rem] text-center text-[0.6rem] uppercase leading-relaxed tracking-[0.2em] text-balance text-ivory/80 sm:text-[0.62rem] sm:tracking-[0.26em] [:lang(bn)_&]:py-2 [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
        {dict.layout.announcement}
      </p>
      <header className="site-header sticky top-0 z-30 border-b border-line/90 bg-paper/[0.97] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-paper/[0.88]">
        <div className="mx-auto grid h-16 w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 md:px-10 lg:h-[5.75rem]">
          <div className="flex items-center gap-0.5 lg:gap-4">
            <MenuButton label={dict.layout.menu} />
            <SearchButton
              index={searchIndex}
              copy={{
                search: dict.header.search,
                close: dict.header.closeSearch,
                placeholder: dict.header.searchPlaceholder,
                products: dict.header.searchProducts,
                pages: dict.header.searchPages,
                empty: dict.header.searchEmpty,
              }}
            />
          </div>

          <Link
            href={href(lang)}
            aria-label={dict.brand.name}
            className="site-header-logo flex justify-self-center transition-opacity duration-500 hover:opacity-70"
          >
            <Logo className="gap-2.5 [&>span]:text-[1.06rem] [&>svg]:h-6 lg:gap-3.5 lg:[&>span]:text-[1.45rem] lg:[&>svg]:h-[2.1rem]" />
          </Link>

          <div className="flex items-center justify-end gap-0.5 lg:gap-5 xl:gap-8">
            <ul className="hidden items-center gap-6 lg:flex xl:gap-9">
              {services.map((l) => (
                <li key={l.href}>
                  <ActiveLink {...l} />
                </li>
              ))}
            </ul>
            {/* Below xl the language switch lives in the menu and footer, keeping the logo centred. */}
            <span aria-hidden className="hidden h-5 w-px bg-line xl:block" />
            <Suspense fallback={null}>
              <LanguageSwitcher lang={lang} labels={dict.ui} className="hidden xl:flex" />
            </Suspense>
            <div className="flex items-center gap-0.5 lg:gap-2">
              <Link
                href={account}
                aria-label={dict.header.account}
                className={cn(iconButton, 'hidden min-[360px]:grid')}
              >
                <UserRound className="size-[1.2rem]" strokeWidth={1.1} />
              </Link>
              <CartButton lang={lang} label={dict.cart.title} />
            </div>
          </div>
        </div>
        <NavTabs label={dict.layout.columns.shop} groups={[cats, shop]} />
      </header>
      <Overlays
        lang={lang}
        cartCopy={cartCopy(dict)}
        menu={{
          title: dict.layout.menu,
          closeLabel: dict.layout.closeMenu,
          sections: [
            {
              title: dict.nav2.byCategory,
              size: 'lg',
              links: [...cats, { href: href(lang, '/shop'), label: dict.nav2.allProducts }],
            },
            {
              title: dict.services.eyebrow,
              size: 'md',
              links: [...services, { href: href(lang, '/bulk'), label: dict.nav.bulk }],
            },
            {
              size: 'sm',
              links: [
                { href: href(lang), label: dict.nav.home },
                { href: href(lang, '/story'), label: dict.layout.story },
                ...help,
              ],
            },
          ],
          footer: (
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <Suspense fallback={null}>
                <LanguageSwitcher lang={lang} labels={dict.ui} variant="full" />
              </Suspense>
              <p className="text-xs text-stone">
                <CopyText>{dict.footer.contact}</CopyText>
              </p>
            </div>
          ),
        }}
      />
    </>
  );
}
