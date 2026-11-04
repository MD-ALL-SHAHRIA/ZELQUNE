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
    <footer className="tone-dark relative isolate mt-44 flow-root bg-night text-ivory sm:mt-56">
      {/* Lamp light: a warm glow under the invitation, a fainter one low on the left. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-14rem] right-[-10rem] size-[50rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-glow)_14%,transparent),transparent)]" />
        <div className="absolute bottom-[-20rem] left-[-16rem] size-[40rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-brass)_9%,transparent),transparent)]" />
      </div>

      {/* The invitation: a walnut card that rests on the footer's top edge, half over the page,
          with a room framed by the brand's arch. Fixed walnut tones, so it stands apart from
          both the page and the footer in either theme. */}
      <Container>
        <div className="relative -mt-28 overflow-hidden bg-[linear-gradient(135deg,#8c6a3b_0%,#6f522c_55%,#5b4224_100%)] shadow-[0_40px_90px_-40px_rgba(20,12,8,0.75)] ring-1 ring-[#e9b872]/25 sm:-mt-36">
          {/* Fine grain of wood: soft vertical lines across the card. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035] [background:repeating-linear-gradient(90deg,#fff_0_1px,transparent_1px_14px)]"
          />
          <div className="relative grid lg:grid-cols-12">
            <div className="px-6 py-12 sm:px-12 sm:py-16 lg:col-span-7 lg:py-20 lg:pr-6 lg:pl-16">
              <p className="flex items-center gap-4 text-[0.7rem] font-medium uppercase tracking-eyebrow text-[#f4dcb0] [:lang(bn)_&]:text-[0.85rem] [:lang(bn)_&]:tracking-normal">
                <span aria-hidden className="h-px w-10 bg-[#f4dcb0]" />
                {f.ctaEyebrow}
              </p>
              <p className="mt-7 max-w-[15ch] font-display text-[clamp(2.4rem,1.4rem+3.6vw,5rem)] font-medium leading-[0.98] tracking-[-0.02em] text-balance text-[#fdf8f0] [:lang(bn)_&]:max-w-[20ch] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.25] [:lang(bn)_&]:tracking-normal">
                {f.ctaHeading}
              </p>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#fdf8f0]/85 sm:text-lg">
                {f.ctaText}
              </p>
              <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
                <ButtonLink
                  href={`${href(lang, '/design')}#consult`}
                  size="lg"
                  className="bg-[#fdf8f0] text-espresso before:bg-[#f4dcb0]"
                >
                  {f.ctaDesign}
                </ButtonLink>
                <ButtonLink
                  href={href(lang, '/shop')}
                  size="lg"
                  variant="light"
                  className="border-[#fdf8f0]/70 text-[#fdf8f0] before:bg-[#fdf8f0] hover:text-espresso"
                >
                  {f.ctaShop}
                </ButtonLink>
              </div>
            </div>
            {/* The room, in an arch that stands on the card's lower edge. */}
            <div className="relative hidden lg:col-span-5 lg:block">
              <div className="absolute inset-x-12 top-14 bottom-0 overflow-hidden rounded-t-full ring-1 ring-[#f4dcb0]/30">
                <Image
                  src="/images/design/design-journey-4.webp"
                  alt=""
                  fill
                  sizes="28rem"
                  className="object-cover object-[45%_50%] transition-transform duration-[1.6s] ease-out-soft hover:scale-105"
                />
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-10 bottom-0 rounded-t-full border border-b-0 border-[#f4dcb0]/35"
              />
            </div>
          </div>
        </div>
      </Container>

      {/* Brand and contact, then the links. */}
      <Container className="mt-20 sm:mt-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
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
      <div className="relative bg-[#2a1d17]">
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
