import { Hammer, HandCoins, Lightbulb, Truck } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { CopyText } from '@/shared/ui/copy-text';
import { LogoMark } from '@/shared/ui/logo';
import { Container } from '@/shared/ui/typography';
import { LanguageSwitcher } from './language-switcher';
import { categoryLinks } from './nav';

const VALUE_ICONS = [Hammer, Lightbulb, HandCoins, Truck];

export function ValuesBand({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-y border-line bg-cream/60">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-4">
        {dict.landing.values.map((v, i) => {
          const Icon = VALUE_ICONS[i] ?? Hammer;
          return (
            <div key={v.title} className="flex flex-col gap-3">
              <Icon aria-hidden className="size-5 text-brass" strokeWidth={1.1} />
              <p className="font-display text-xl font-light leading-tight sm:text-2xl">{v.title}</p>
              <p className="text-sm text-stone">{v.text}</p>
            </div>
          );
        })}
      </Container>
    </section>
  );
}

export function Footer({
  lang,
  dict,
  categories,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  const columns = [
    {
      title: dict.layout.columns.shop,
      links: [
        { href: href(lang, '/shop'), label: dict.shop.title },
        ...categoryLinks(lang, categories),
        { href: href(lang, '/design'), label: dict.nav2.design },
        { href: href(lang, '/construction'), label: dict.header.construction },
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
    <footer className="tone-dark relative isolate mt-28 overflow-hidden bg-night text-ivory">
      {/* Lamp light: one warm glow in the corner, nothing else. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-56 -z-10 size-[42rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_16%,transparent),transparent)]"
      />
      <Container className="pt-20 sm:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <LogoMark className="h-10 text-ivory sm:h-12" />
            <p className="mt-10 max-w-[19ch] font-display text-[clamp(2.25rem,1.4rem+3.3vw,4.6rem)] font-light leading-[1.03] tracking-[-0.015em] text-balance [:lang(bn)_&]:max-w-[22ch] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.3] [:lang(bn)_&]:tracking-normal">
              {dict.brand.tagline}
            </p>
          </div>
          <div className="space-y-5 text-sm text-ivory/85 lg:col-span-4 lg:justify-self-end lg:pb-3">
            <p>
              <CopyText>{dict.footer.contact}</CopyText>
            </p>
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <span>
                {dict.footer.facebook} <CopyText>{'[[link]]'}</CopyText>
              </span>
              <span>
                {dict.footer.instagram} <CopyText>{'[[link]]'}</CopyText>
              </span>
            </p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 border-t border-ivory/15 pt-14 sm:grid-cols-4 sm:mt-20">
          {columns.map((col) => (
            <div key={col.title}>
              <FooterTitle>{col.title}</FooterTitle>
              <ul className="space-y-3.5 text-[0.9rem]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="link-reveal text-ivory/85 transition-colors duration-300 hover:text-ivory"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <FooterTitle>{dict.ui.language}</FooterTitle>
            <Suspense fallback={null}>
              <LanguageSwitcher
                lang={lang}
                labels={dict.ui}
                variant="full"
                className="text-[0.9rem] text-ivory"
              />
            </Suspense>
          </div>
        </div>
      </Container>

      {/* Oversized brass wordmark (SVG text: scales with the container, never wraps), shown in
          full above the copyright line. */}
      <Container className="mt-20 pb-8 sm:mt-24 sm:pb-10">
        <svg aria-hidden viewBox="0 0 1000 132" className="block w-full select-none">
          <text
            x="500"
            y="118"
            textAnchor="middle"
            textLength="990"
            lengthAdjust="spacingAndGlyphs"
            className="fill-brass/60 font-wordmark text-[160px] font-medium uppercase"
          >
            Zelqune
          </text>
        </svg>
      </Container>
      <div className="border-t border-ivory/10">
        <Container className="flex items-center justify-center gap-3 py-6 text-[0.8rem] text-ivory/75 sm:justify-between">
          <p>{dict.footer.copyright}</p>
          <LogoMark className="hidden h-4 text-brass sm:block" />
        </Container>
      </div>
    </footer>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-[0.66rem] font-medium uppercase tracking-eyebrow text-brass [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
      {children}
    </p>
  );
}
