import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';

export interface NavLink {
  href: string;
  label: string;
}

export function categoryLinks(lang: Locale, categories: Category[]): NavLink[] {
  return categories.map((c) => ({
    href: href(lang, `/category/${c.slug}`),
    label: lang === 'bn' ? c.nameBn : c.nameEn,
  }));
}

/** Services shown as text links in the top row (desktop) and in the menu. */
export function serviceNav(lang: Locale, dict: Dictionary): NavLink[] {
  return [
    { href: href(lang, '/design'), label: dict.nav2.design },
    { href: href(lang, '/construction'), label: dict.header.construction },
  ];
}

/** Tabs after the catalog categories in the second header row. */
export function shopNav(lang: Locale, dict: Dictionary): NavLink[] {
  return [
    { href: href(lang, '/shop'), label: dict.nav2.allProducts },
    { href: href(lang, '/bulk'), label: dict.nav.bulk },
    { href: href(lang, '/story'), label: dict.layout.story },
  ];
}

export function helpNav(lang: Locale, dict: Dictionary): NavLink[] {
  return [
    { href: href(lang, '/track'), label: dict.nav.track },
    { href: href(lang, '/faq'), label: dict.nav.faq },
    { href: href(lang, '/account'), label: dict.header.account },
  ];
}

/** True when `pathname` is the link's page or one below it (home only matches exactly). */
export function isActivePath(pathname: string, target: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (/^\/(en|bn)$/.test(target)) return path === target;
  return path === target || path.startsWith(`${target}/`);
}
