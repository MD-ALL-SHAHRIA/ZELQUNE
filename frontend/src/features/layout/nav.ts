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

export function primaryNav(lang: Locale, dict: Dictionary) {
  return {
    shop: { href: href(lang, '/shop'), label: dict.nav.shop },
    rest: [
      { href: href(lang, '/design'), label: dict.nav2.design },
      { href: href(lang, '/bulk'), label: dict.nav.bulk },
      { href: href(lang, '/story'), label: dict.layout.story },
    ],
  };
}

export function secondaryNav(lang: Locale, dict: Dictionary): NavLink[] {
  return [
    { href: href(lang, '/track'), label: dict.nav.track },
    { href: href(lang, '/faq'), label: dict.nav.faq },
  ];
}
