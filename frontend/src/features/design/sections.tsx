import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type District } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { whatsappHref } from '@/shared/lib/whatsapp';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { ConsultationForm } from './consultation-form';
import { SECTORS, sectorImages, type SectorSpace } from './sectors';

/** "01" / "০১": step numerals in the page's own digits. */
function numeral(i: number, lang: Locale) {
  return formatNumber(i + 1, lang).padStart(2, lang === 'bn' ? '০' : '0');
}

/**
 * Full-bleed interior hero (RH Interior Design manner): the room fills the screen, the studio's
 * name and promise sit low on the left, and the five sectors run along the foot as the studio's
 * own navigation. On a sector page the eyebrow leads back to the studio overview.
 */
export function DesignHero({
  lang,
  dict,
  image,
  title,
  lead,
  current,
}: {
  lang: Locale;
  dict: Dictionary;
  image: string;
  title: string;
  lead: string;
  /** The sector this page is about (sector pages), else the overview. */
  current?: SectorSpace;
}) {
  const d = dict.design;
  return (
    <section className="relative isolate flex min-h-[calc(100svh-8rem)] flex-col justify-end overflow-hidden bg-ink text-paper">
      <Image src={image} alt="" fill preload sizes="100vw" className="-z-10 object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,18,15,0.3)_0%,rgba(22,18,15,0.05)_28%,rgba(22,18,15,0.35)_58%,rgba(22,18,15,0.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(22,18,15,0.7)_0%,rgba(22,18,15,0.25)_50%,rgba(22,18,15,0)_75%),linear-gradient(180deg,rgba(22,18,15,0)_50%,rgba(22,18,15,0.85)_100%)]"
      />
      <Container className="pb-8 pt-36 sm:pb-10">
        <div className="max-w-3xl space-y-7">
          <Eyebrow className="flex items-center gap-4 text-paper/80">
            <span aria-hidden className="h-px w-10 bg-amber" />
            {current ? (
              <Link href={href(lang, '/design')} className="transition-colors hover:text-paper">
                {d.eyebrow}
              </Link>
            ) : (
              d.eyebrow
            )}
          </Eyebrow>
          <Heading as="h1" level="display">
            {title}
          </Heading>
          <p className="max-w-xl text-base leading-relaxed text-paper/85 sm:text-lg">{lead}</p>
          <ButtonLink href="#consult" size="lg" className="bg-paper text-ink hover:bg-glow">
            {d.button}
            <span aria-hidden>↓</span>
          </ButtonLink>
        </div>
        <nav aria-label={d.sectorsHeading} className="mt-14 border-t border-paper/25 sm:mt-16">
          <ul className="scrollbar-none -mx-5 flex gap-8 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-5 md:gap-0 md:px-0">
            {SECTORS.map((s, i) => {
              const here = s.space === current;
              return (
                <li key={s.slug} className="relative shrink-0">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -top-[3px] left-0 size-[5px]',
                      here ? 'bg-amber' : 'bg-paper/50',
                    )}
                  />
                  <Link
                    href={href(lang, `/design/${s.slug}`)}
                    aria-current={here ? 'page' : undefined}
                    className={cn(
                      'group flex items-baseline gap-3 pb-1 pt-5 text-sm transition-colors md:pr-4',
                      here ? 'text-paper' : 'text-paper/70 hover:text-paper',
                    )}
                  >
                    <span className="font-display text-sm italic text-glow">
                      {numeral(i, lang)}
                    </span>
                    <span className="underline-offset-[6px] decoration-paper/40 group-hover:underline">
                      {d.sectors[s.space].title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>
      <p className="absolute right-4 top-24 text-[0.6rem] text-paper/55 sm:bottom-3 sm:top-auto">
        {dict.landing.sampleNote}
      </p>
    </section>
  );
}

/**
 * What we design: an editorial grid. On the overview, two large rooms lead and three follow;
 * on a sector page the other four sit as an even pair of rows.
 */
export function SectorGrid({
  lang,
  dict,
  exclude,
}: {
  lang: Locale;
  dict: Dictionary;
  exclude?: SectorSpace;
}) {
  const d = dict.design;
  const sectors = SECTORS.filter((s) => s.space !== exclude);
  return (
    <section className={cn('py-24 sm:py-32', exclude && 'border-t border-line')}>
      <Container>
        <div className="reveal mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
          <div className="space-y-5">
            <Eyebrow>{d.eyebrow}</Eyebrow>
            <Heading>{d.sectorsHeading}</Heading>
          </div>
          {exclude ? null : <Lead className="max-w-xl lg:justify-self-end">{d.lead}</Lead>}
        </div>
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-6 lg:gap-x-8 lg:gap-y-20">
          {sectors.map((s, i) => {
            const large = !!exclude || i < 2;
            return (
              <li
                key={s.slug}
                className={cn(
                  'reveal',
                  large ? 'lg:col-span-3' : 'lg:col-span-2',
                  // An odd last card on two columns takes the full row.
                  sectors.length % 2 === 1 && i === sectors.length - 1 && 'sm:col-span-2',
                )}
              >
                <Link href={href(lang, `/design/${s.slug}`)} className="group block">
                  <Picture
                    src={sectorImages(s.space)[0] ?? ''}
                    alt={d.sectors[s.space].title}
                    sizes={
                      large
                        ? '(min-width: 1024px) 46vw, (min-width: 640px) 45vw, 92vw'
                        : '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw'
                    }
                    ratio={large ? 'aspect-[5/4]' : 'aspect-[4/5]'}
                    arch={!exclude && i === 3}
                  />
                  <div className="mt-6 flex items-baseline gap-4 border-t border-line pt-5">
                    <span className="font-display text-lg italic text-walnut">
                      {numeral(SECTORS.indexOf(s), lang)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="font-display text-[1.9rem] font-light leading-tight [:lang(bn)_&]:text-2xl">
                          {d.sectors[s.space].title}
                        </h3>
                        <span className="shrink-0 text-[0.7rem] uppercase tracking-eyebrow text-stone transition-colors group-hover:text-ink">
                          {d.explore}{' '}
                          <span
                            aria-hidden
                            className="inline-block transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </span>
                      </div>
                      <p className="max-w-md text-sm leading-relaxed text-ink/75">
                        {d.sectors[s.space].text}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/**
 * How it works: four steps as one drawn line, with a node per step (horizontal on desktop,
 * vertical on phones), from first call to the lit, finished room.
 */
export function DesignProcess({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const d = dict.design;
  const last = d.steps.length - 1;
  return (
    <section className="bg-ink py-24 text-paper sm:py-32">
      <Container>
        <div className="reveal mb-16 space-y-5 sm:mb-20">
          <Eyebrow className="text-paper/60">{d.eyebrow}</Eyebrow>
          <Heading>{d.processHeading}</Heading>
        </div>
        <ol className="relative grid gap-12 pl-12 md:grid-cols-4 md:gap-10 md:pl-0">
          {/* The line: ink to amber, like a room coming to light. */}
          <span
            aria-hidden
            className="absolute bottom-2 left-[5px] top-2 w-px bg-[linear-gradient(180deg,rgba(244,236,223,0.3),var(--color-amber))] md:bottom-auto md:left-0 md:right-0 md:top-[5px] md:h-px md:w-auto md:bg-[linear-gradient(90deg,rgba(244,236,223,0.3),var(--color-amber))]"
          />
          {d.steps.map((step, i) => (
            <li key={step.title} className="reveal relative space-y-4 md:pt-12">
              <span
                aria-hidden
                className={cn(
                  'absolute -left-12 top-1 size-[11px] border md:left-0 md:top-0',
                  i === last ? 'rounded-full border-amber bg-amber' : 'border-paper/60 bg-ink',
                )}
              />
              <span className="block font-display text-6xl font-light italic leading-none text-glow">
                {numeral(i, lang)}
              </span>
              <p className="font-display text-[1.7rem] font-light leading-tight">{step.title}</p>
              <p className="max-w-xs text-sm leading-relaxed text-paper/70">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function Included({ lang, dict, image }: { lang: Locale; dict: Dictionary; image: string }) {
  const d = dict.design;
  return (
    <section className="py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <Picture
          src={image}
          alt=""
          sizes="(min-width: 1024px) 45vw, 100vw"
          arch
          className="reveal mx-auto w-full max-w-lg lg:max-w-none"
        />
        <div className="reveal space-y-10">
          <div className="space-y-5">
            <Eyebrow>{d.eyebrow}</Eyebrow>
            <Heading>{d.includedHeading}</Heading>
          </div>
          <ol className="border-t border-line">
            {d.included.map((item, i) => (
              <li
                key={item}
                className="flex items-baseline gap-6 border-b border-line py-6 font-display text-2xl font-light leading-snug sm:text-[1.75rem] [:lang(bn)_&]:text-xl"
              >
                <span className="w-8 shrink-0 text-base italic text-walnut">
                  {numeral(i, lang)}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <p className="text-sm text-stone">
            <CopyText>{d.fees}</CopyText>
          </p>
        </div>
      </Container>
    </section>
  );
}

/**
 * No invented portfolio: three empty frames (one arched) wait for the first real projects, with
 * the placeholder left visible.
 */
export function Projects({ dict }: { dict: Dictionary }) {
  return (
    <section className="glow border-y border-line py-24 sm:py-28">
      <Container className="space-y-14">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Eyebrow>{dict.design.eyebrow}</Eyebrow>
          <Heading>{dict.design.projectsHeading}</Heading>
          <p>
            <CopyText>{dict.design.projectsPlaceholder}</CopyText>
          </p>
        </div>
        <div aria-hidden className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-4 sm:gap-7">
          {['aspect-[4/5]', 'aspect-[4/5] rounded-t-full', 'aspect-[4/5]'].map((shape, i) => (
            <span
              key={i}
              className={cn(
                'block border border-dashed border-walnut/35 bg-paper/40 p-2.5 sm:p-4 [&>span]:rounded-[inherit]',
                shape,
                i === 1 && 'sm:-translate-y-6',
              )}
            >
              {/* An inner mat line, like an empty frame waiting for its photograph. */}
              <span className="block size-full border border-walnut/10 bg-[linear-gradient(180deg,transparent_60%,color-mix(in_oklab,var(--color-glow)_35%,transparent))]" />
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** The consultation: a calm two-column layout, the brief on a quiet card beside the promise. */
export function ConsultSection({
  lang,
  dict,
  districts,
  defaultSpace,
}: {
  lang: Locale;
  dict: Dictionary;
  districts: District[];
  defaultSpace?: SectorSpace;
}) {
  const chat = whatsappHref(fill(dict.premium.chat.message, { item: dict.design.eyebrow }));
  return (
    <section id="consult" className="scroll-mt-24 bg-cream/50 py-24 sm:py-32">
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.55fr] lg:gap-20 xl:gap-28">
        <div className="space-y-8 lg:sticky lg:top-40 lg:self-start">
          <div className="space-y-6">
            <Eyebrow>{dict.design.eyebrow}</Eyebrow>
            <Heading>{dict.consult.heading}</Heading>
            <Lead>{dict.consult.text}</Lead>
          </div>
          <ol className="hidden border-t border-line lg:block">
            {dict.design.steps.map((step, i) => (
              <li
                key={step.title}
                className="flex items-baseline gap-5 border-b border-line py-4 text-sm"
              >
                <span className="font-display text-base italic text-walnut">
                  {numeral(i, lang)}
                </span>
                <span>{step.title}</span>
              </li>
            ))}
          </ol>
          {chat ? (
            <a
              href={chat}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-sm underline decoration-ink/30 underline-offset-[6px] transition hover:decoration-ink"
            >
              <MessageCircle aria-hidden className="size-4" strokeWidth={1.3} />
              {dict.premium.chat.label}
            </a>
          ) : null}
        </div>
        <div className="border border-line bg-paper p-6 shadow-[0_30px_80px_-40px_rgba(22,18,15,0.18)] sm:p-10 lg:p-12">
          <ConsultationForm
            lang={lang}
            districts={districts}
            copy={{ consult: dict.consult, checkout: dict.checkout, bulk: dict.bulk }}
            defaultSpace={defaultSpace}
          />
        </div>
      </Container>
    </section>
  );
}
