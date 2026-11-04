import { CookieSettingsButton } from '@/features/consent/cookie-banner';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type HomeContent } from '@/shared/api/content';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { LogoMark } from '@/shared/ui/logo';
import { Container } from '@/shared/ui/typography';
import { LanguageSwitcher } from './language-switcher';
import { categoryLinks } from './nav';

export function Footer({
  lang,
  dict,
  categories,
  contact,
  business,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  /** Phone, email and social links from the dashboard (copy-doc placeholders until set). */
  contact?: HomeContent['contact'] | null;
  /** The confirmed legal identity line; hidden until the owner confirms it. */
  business?: string | null;
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
        { href: href(lang, '/cookies'), label: dict.cookies.footer },
      ],
    },
  ];
  const f = dict.footer;
  const social = [
    contact?.facebook ? { href: contact.facebook, label: f.facebook } : null,
    contact?.instagram ? { href: contact.instagram, label: f.instagram } : null,
  ].filter((x): x is { href: string; label: string } => !!x);
  return (
    <footer className="tone-dark relative isolate mt-28 overflow-hidden bg-night text-ivory">
      {/* Lamp light: a warm glow behind the invitation, a fainter one low on the left. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-64 right-[-12rem] -z-10 size-[52rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_18%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20rem] left-[-16rem] -z-10 size-[40rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brass)_10%,transparent),transparent)]"
      />

      {/* The invitation: start a project, framed by the brand's arch. */}
      <Container className="pt-20 sm:pt-28">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-4 text-[0.7rem] font-medium uppercase tracking-eyebrow text-brass [:lang(bn)_&]:text-[0.85rem] [:lang(bn)_&]:tracking-normal">
              <span aria-hidden className="h-px w-10 bg-brass" />
              {f.ctaEyebrow}
            </p>
            <p className="mt-8 max-w-[16ch] font-display text-[clamp(2.6rem,1.5rem+4vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.02em] text-balance [:lang(bn)_&]:max-w-[20ch] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.25] [:lang(bn)_&]:tracking-normal">
              {f.ctaHeading}
            </p>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-ivory/75 sm:text-lg">
              {f.ctaText}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <ButtonLink
                href={`${href(lang, '/design')}#consult`}
                size="lg"
                className="bg-ivory text-espresso before:bg-glow"
              >
                {f.ctaDesign}
              </ButtonLink>
              <ButtonLink href={href(lang, '/shop')} size="lg" variant="light">
                {f.ctaShop}
              </ButtonLink>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[22rem] lg:col-span-5 lg:mr-0 lg:max-w-[26rem]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-full ring-1 ring-ivory/15">
              <Image
                src="/images/design/design-journey-4.webp"
                alt=""
                fill
                sizes="(min-width: 1024px) 26rem, 22rem"
                className="object-cover object-[45%_50%] transition-transform duration-[1.6s] ease-out-soft hover:scale-105"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(26,18,15,.55))]"
              />
            </div>
            {/* A thin brass arch traced just outside the photo. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-x-3 -top-3 bottom-0 rounded-t-full border border-b-0 border-brass/30"
            />
          </div>
        </div>
      </Container>

      {/* Brand and contact, then the links. */}
      <Container className="mt-20 sm:mt-28">
        <div className="grid gap-14 border-t border-ivory/15 pt-14 sm:pt-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <LogoMark className="h-9 text-ivory sm:h-10" />
            <p className="mt-6 max-w-[26ch] font-display text-2xl leading-snug text-ivory/90 [:lang(bn)_&]:leading-normal">
              {dict.brand.tagline}
            </p>
            <p className="mt-3 text-[0.85rem] text-ivory/60">{f.made}</p>
            <div className="mt-10 space-y-4 text-[0.95rem]">
              {contact?.phone ? (
                <ContactRow label={f.call}>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="link-reveal">
                    {contact.phone}
                  </a>
                </ContactRow>
              ) : null}
              {contact?.email ? (
                <ContactRow label={f.email}>
                  <a href={`mailto:${contact.email}`} className="link-reveal break-all">
                    {contact.email}
                  </a>
                </ContactRow>
              ) : null}
              {!contact?.phone && !contact?.email ? (
                <p>
                  <CopyText>{f.contact}</CopyText>
                </p>
              ) : null}
              {social.length ? (
                <ContactRow label={f.follow}>
                  <span className="flex flex-wrap gap-x-5 gap-y-2">
                    {social.map((s) => (
                      <a
                        key={s.href}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 link-reveal"
                      >
                        {s.label}
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 text-brass transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </a>
                    ))}
                  </span>
                </ContactRow>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <FooterTitle>{col.title}</FooterTitle>
                <ul className="space-y-3.5 text-[0.92rem]">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center text-ivory/75 transition-colors duration-300 hover:text-ivory"
                      >
                        <span
                          aria-hidden
                          className="h-px w-0 bg-brass transition-[width,margin] duration-500 ease-out-soft group-hover:mr-2 group-hover:w-3"
                        />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <FooterTitle>{dict.ui.language}</FooterTitle>
              <Suspense fallback={null}>
                <LanguageSwitcher
                  lang={lang}
                  labels={dict.ui}
                  variant="full"
                  className="text-[0.92rem] text-ivory"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </Container>

      {/* Oversized brass wordmark (SVG text: scales with the container, never wraps), fading
          into the band and running off its lower edge. */}
      <div className="mt-20 sm:mt-28">
        <Container>
          <svg aria-hidden viewBox="0 0 1000 130" className="block w-full select-none">
            <defs>
              <linearGradient id="footer-wordmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-brass)" stopOpacity="0.75" />
                <stop offset="1" stopColor="var(--color-brass)" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <text
              x="500"
              y="124"
              textAnchor="middle"
              textLength="990"
              lengthAdjust="spacingAndGlyphs"
              fill="url(#footer-wordmark)"
              className="font-wordmark text-[160px] font-medium uppercase"
            >
              Zelqune
            </text>
          </svg>
        </Container>
      </div>
      <div className="relative border-t border-ivory/10 bg-night">
        <Container className="flex flex-col items-center gap-4 py-6 text-[0.8rem] text-ivory/65 sm:flex-row sm:flex-wrap sm:justify-between">
          <p>{f.copyright}</p>
          {business ? <p className="text-ivory/55">{business}</p> : null}
          <div className="flex items-center gap-6">
            {/* Change or withdraw the cookie choice at any time. */}
            <CookieSettingsButton label={dict.consent.settings} />
            <a
              href="#"
              className="group inline-flex items-center gap-2 text-ivory/80 transition-colors hover:text-ivory"
            >
              {f.backToTop}
              <span className="grid size-8 place-items-center rounded-full border border-ivory/25 transition-colors group-hover:border-brass group-hover:text-brass">
                <ArrowUp aria-hidden className="size-3.5" />
              </span>
            </a>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <dl className="flex items-baseline gap-5">
      <dt className="w-16 shrink-0 text-[0.66rem] font-medium uppercase tracking-eyebrow text-brass [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
        {label}
      </dt>
      <dd className="min-w-0 text-ivory/90">{children}</dd>
    </dl>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-[0.66rem] font-medium uppercase tracking-eyebrow text-brass [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
      {children}
    </p>
  );
}
