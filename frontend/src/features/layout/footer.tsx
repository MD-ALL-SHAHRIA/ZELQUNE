import { Hammer, HandCoins, Lightbulb, Truck } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { CopyText } from '@/shared/ui/copy-text';
import { LogoMark } from '@/shared/ui/logo';
import { Container } from '@/shared/ui/typography';
import { LanguageSwitcher } from './language-switcher';

const VALUE_ICONS = [Hammer, Lightbulb, HandCoins, Truck];

export function ValuesBand({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-y border-line bg-cream/60">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-4">
        {dict.landing.values.map((v, i) => {
          const Icon = VALUE_ICONS[i] ?? Hammer;
          return (
            <div key={v.title} className="flex flex-col gap-3">
              <Icon aria-hidden className="size-5 text-walnut" strokeWidth={1.1} />
              <p className="font-display text-xl font-light leading-tight sm:text-2xl">{v.title}</p>
              <p className="text-sm text-stone">{v.text}</p>
            </div>
          );
        })}
      </Container>
    </section>
  );
}

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const columns = [
    {
      title: dict.layout.columns.shop,
      links: [
        { href: href(lang, '/shop'), label: dict.shop.title },
        {
          href: href(lang, '/products/alo-arch-panel'),
          label: dict.products['alo-arch-panel']?.name ?? '',
        },
        { href: href(lang, '/bulk'), label: dict.nav.bulk },
      ],
    },
    {
      title: dict.layout.columns.help,
      links: [
        { href: href(lang, '/track'), label: dict.nav.track },
        { href: href(lang, '/bulk/track'), label: dict.bulk.trackHeading },
        { href: href(lang, '/faq'), label: dict.nav.faq },
        { href: href(lang, '/returns'), label: dict.footer.returns },
      ],
    },
    {
      title: dict.layout.columns.company,
      links: [
        { href: href(lang, '/story'), label: dict.layout.story },
        { href: href(lang, '/terms'), label: dict.footer.terms },
        { href: href(lang, '/privacy'), label: dict.footer.privacy },
      ],
    },
  ];
  return (
    <footer className="mt-28 bg-ink text-paper">
      <Container className="grid gap-14 pb-12 pt-20 lg:grid-cols-[1.3fr_2fr]">
        <div className="space-y-6">
          <LogoMark className="h-14 text-paper" />
          <p className="max-w-sm font-display text-3xl font-light leading-tight">
            {dict.brand.tagline}
          </p>
          <p className="text-sm text-paper/70">
            <CopyText>{dict.footer.contact}</CopyText>
          </p>
          <p className="flex gap-6 text-sm text-paper/70">
            <span>
              {dict.footer.facebook} <CopyText>{'[[link]]'}</CopyText>
            </span>
            <span>
              {dict.footer.instagram} <CopyText>{'[[link]]'}</CopyText>
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-5 text-[0.68rem] uppercase tracking-eyebrow text-paper/50 [:lang(bn)_&]:text-xs [:lang(bn)_&]:tracking-normal">
                {col.title}
              </p>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-paper/85 transition-colors hover:text-glow">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <Container>
        <p
          aria-hidden
          className="select-none overflow-hidden whitespace-nowrap border-t border-paper/15 pt-10 text-center font-display text-[15vw] font-light uppercase leading-[0.8] tracking-[0.14em] text-paper/[0.07] lg:text-[13.5rem]"
        >
          Zelqune
        </p>
      </Container>
      <Container className="flex flex-col items-center justify-between gap-4 py-8 text-xs text-paper/55 sm:flex-row">
        <p>{dict.footer.copyright}</p>
        <Suspense fallback={null}>
          <LanguageSwitcher lang={lang} labels={dict.ui} className="text-paper/80" />
        </Suspense>
      </Container>
    </footer>
  );
}
