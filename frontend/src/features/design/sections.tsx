import Image from 'next/image';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatNumber } from '@/i18n/format';
import { type District } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { ConsultationForm } from './consultation-form';
import { SECTORS, sectorImages, type SectorSpace } from './sectors';

/** Full-bleed interior hero (RH-style), with a consultation call to action. */
export function DesignHero({
  image,
  eyebrow,
  title,
  lead,
  cta,
  note,
}: {
  image: string;
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  note: string;
}) {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-ink text-paper">
      <Image src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,18,15,0.1)_0%,rgba(22,18,15,0.2)_45%,rgba(22,18,15,0.8)_100%)]"
      />
      <Container className="space-y-6 pb-14 pt-32 sm:pb-20">
        <Eyebrow className="text-paper/75">{eyebrow}</Eyebrow>
        <Heading as="h1" level="display" className="max-w-4xl">
          {title}
        </Heading>
        <p className="max-w-2xl text-base leading-relaxed text-paper/85 sm:text-lg">{lead}</p>
        <ButtonLink href="#consult" size="lg" className="bg-paper text-ink hover:bg-glow">
          {cta}
        </ButtonLink>
      </Container>
      <p className="absolute bottom-3 right-4 text-[0.6rem] text-paper/50">{note}</p>
    </section>
  );
}

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
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="reveal mb-12 space-y-5">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <Heading>{d.sectorsHeading}</Heading>
        </div>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.filter((s) => s.space !== exclude).map((s, i) => (
            <Link
              key={s.slug}
              href={href(lang, `/design/${s.slug}`)}
              className="reveal group block"
            >
              <Picture
                src={sectorImages(s.space)[0] ?? ''}
                alt={d.sectors[s.space].title}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                ratio={i === 0 && !exclude ? 'aspect-[4/5]' : 'aspect-[4/5]'}
                arch={i % 3 === 1}
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-3xl font-light">{d.sectors[s.space].title}</h3>
                <span className="text-xs uppercase tracking-eyebrow text-stone group-hover:text-ink">
                  {d.explore} →
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/75">{d.sectors[s.space].text}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function DesignProcess({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const d = dict.design;
  return (
    <section className="bg-ink py-24 text-paper sm:py-32">
      <Container>
        <div className="reveal mb-14 space-y-5">
          <Eyebrow className="text-paper/60">{d.eyebrow}</Eyebrow>
          <Heading>{d.processHeading}</Heading>
        </div>
        <ol className="grid gap-px bg-paper/15 sm:grid-cols-2 lg:grid-cols-4">
          {d.steps.map((step, i) => (
            <li key={step.title} className="reveal space-y-4 bg-ink p-8 lg:p-10">
              <span className="font-display text-5xl font-light italic text-glow">
                {formatNumber(i + 1, lang).padStart(2, lang === 'bn' ? '০' : '0')}
              </span>
              <p className="font-display text-2xl font-light">{step.title}</p>
              <p className="text-sm leading-relaxed text-paper/75">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function Included({ dict, image }: { dict: Dictionary; image: string }) {
  const d = dict.design;
  return (
    <section className="py-24 sm:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Picture
          src={image}
          alt=""
          sizes="(min-width: 1024px) 45vw, 100vw"
          arch
          className="reveal"
        />
        <div className="reveal space-y-8">
          <Heading>{d.includedHeading}</Heading>
          <ul className="divide-y divide-line border-y border-line">
            {d.included.map((item) => (
              <li
                key={item}
                className="flex items-center gap-4 py-5 font-display text-2xl font-light"
              >
                <span aria-hidden className="size-1.5 rounded-full bg-amber" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-stone">
            <CopyText>{d.fees}</CopyText>
          </p>
        </div>
      </Container>
    </section>
  );
}

/** No invented portfolio: a visible placeholder until real projects exist. */
export function Projects({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-y border-line bg-cream/60 py-20">
      <Container className="space-y-6 text-center">
        <Heading level="h3">{dict.design.projectsHeading}</Heading>
        <p>
          <CopyText>{dict.design.projectsPlaceholder}</CopyText>
        </p>
      </Container>
    </section>
  );
}

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
  return (
    <section id="consult" className="glow scroll-mt-24 py-24 sm:py-32">
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-24">
        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>{dict.design.eyebrow}</Eyebrow>
          <Heading>{dict.consult.heading}</Heading>
          <Lead>{dict.consult.text}</Lead>
        </div>
        <ConsultationForm
          lang={lang}
          districts={districts}
          copy={{ consult: dict.consult, checkout: dict.checkout, bulk: dict.bulk }}
          defaultSpace={defaultSpace}
        />
      </Container>
    </section>
  );
}
