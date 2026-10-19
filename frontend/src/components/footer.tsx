import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/lib/site';
import { Text } from './text';

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const links = [
    { href: href(lang, '/bulk'), label: dict.nav.bulk },
    { href: href(lang, '/bulk/track'), label: dict.bulk.trackHeading },
    { href: href(lang, '/terms'), label: dict.footer.terms },
    { href: href(lang, '/returns'), label: dict.footer.returns },
    { href: href(lang, '/privacy'), label: dict.footer.privacy },
    { href: href(lang, '/faq'), label: dict.nav.faq },
  ];
  return (
    <footer className="mt-16 bg-walnut text-cream">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-lg font-semibold">{dict.brand.name}</p>
          <p className="text-sm opacity-90">{dict.brand.tagline}</p>
          <p className="text-sm">
            <Text>{dict.footer.contact}</Text>
          </p>
          <p className="flex gap-4 text-sm">
            {/* Page URLs are not known yet: placeholders until the owner opens the pages. */}
            <span>
              {dict.footer.facebook} <Text>{'[[link]]'}</Text>
            </span>
            <span>
              {dict.footer.instagram} <Text>{'[[link]]'}</Text>
            </span>
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="underline-offset-4 hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-cream/20 px-4 py-4 text-center text-xs opacity-80">
        {dict.footer.copyright}
      </p>
    </footer>
  );
}
