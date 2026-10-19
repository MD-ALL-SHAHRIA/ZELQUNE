import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';

export function primaryNav(lang: Locale, dict: Dictionary) {
  return [
    { href: href(lang, '/shop'), label: dict.nav.shop },
    { href: href(lang, '/bulk'), label: dict.nav.bulk },
    { href: href(lang, '/story'), label: dict.layout.story },
  ];
}

export function secondaryNav(lang: Locale, dict: Dictionary) {
  return [
    { href: href(lang, '/track'), label: dict.nav.track },
    { href: href(lang, '/faq'), label: dict.nav.faq },
  ];
}
