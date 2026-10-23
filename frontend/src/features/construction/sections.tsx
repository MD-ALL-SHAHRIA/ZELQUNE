import { MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill } from '@/i18n/format';
import { type District } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { whatsappHref } from '@/shared/lib/whatsapp';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { BuildForm } from './build-form';

/** Fine drafting-paper grid: the site plan behind the construction story. */
const BLUEPRINT =
  'bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-walnut)_9%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-walnut)_9%,transparent)_1px,transparent_1px)] bg-[size:56px_56px]';

/** Full-bleed architecture hero with the six stages running along its foot like a section line. */
export function ConstructionHero({
  dict,
  image,
}: {
  lang: Locale;
  dict: Dictionary;
  image: string;
}) {
  const d = dict.construction;
  return (
    <section className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden tone-dark bg-night text-ivory">
      <Image src={image} alt="" fill preload sizes="100vw" className="-z-10 object-cover" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,17,15,0.35)_0%,rgba(20,17,15,0.05)_30%,rgba(20,17,15,0.45)_62%,rgba(20,17,15,0.92)_100%)] lg:bg-[linear-gradient(90deg,rgba(20,17,15,0.78)_0%,rgba(20,17,15,0.35)_48%,rgba(20,17,15,0)_75%),linear-gradient(180deg,rgba(20,17,15,0)_55%,rgba(20,17,15,0.85)_100%)]"
      />
      <Container className="pb-10 pt-36 sm:pb-14">
        <div className="max-w-3xl space-y-7">
          <Eyebrow className="flex items-center gap-4 text-ivory/80">
            <span aria-hidden className="h-px w-10 bg-amber" />
            {d.eyebrow}
          </Eyebrow>
          <Heading as="h1" level="display">
            {d.heading}
          </Heading>
          <p className="max-w-xl text-base leading-relaxed text-ivory/85 sm:text-lg">{d.lead}</p>
          <ButtonLink href="#start" size="lg" className="bg-paper text-ink hover:bg-glow">
            {d.button}
            <span aria-hidden>↓</span>
          </ButtonLink>
        </div>
        <ol className="mt-16 hidden grid-cols-6 border-t border-ivory/25 md:grid">
          {d.stages.map((s) => (
            <li key={s.title} className="relative pt-5 pr-4">
              <span aria-hidden className="absolute -top-[3px] left-0 size-[5px] bg-amber" />
              <span aria-hidden className="block bg-glow h-px w-8" />
              <span className="mt-1 block text-sm text-ivory/85">{s.title}</span>
            </li>
          ))}
        </ol>
      </Container>
      <p className="absolute right-4 top-24 text-[0.6rem] text-ivory/55 sm:bottom-3 sm:top-auto">
        {dict.construction.sampleNote}
      </p>
    </section>
  );
}

const TYPE_IMAGES = ['modernHouse', 'woodFacade', 'office', 'cafeLights'] as const;
type TypeImage = (typeof TYPE_IMAGES)[number];

/** What we build: four building types as a staggered editorial row. */
export function BuildTypes({
  dict,
  images,
}: {
  lang: Locale;
  dict: Dictionary;
  images: Record<TypeImage, string>;
}) {
  const d = dict.construction;
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="reveal mb-14 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div className="space-y-5">
            <Eyebrow>{d.eyebrow}</Eyebrow>
            <Heading>{d.typesHeading}</Heading>
          </div>
          <Lead className="max-w-xl lg:justify-self-end">{dict.services.construction.text}</Lead>
        </div>
        <ul className="reveal scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:pb-16">
          {d.types.map((t, i) => (
            <li
              key={t.title}
              className={cn(
                'w-[78%] shrink-0 snap-start sm:w-auto',
                i % 2 === 1 && 'lg:translate-y-16',
              )}
            >
              <Picture
                src={images[TYPE_IMAGES[i] ?? 'modernHouse']}
                alt={t.title}
                sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 92vw"
                ratio="aspect-[3/4]"
                arch={i === 1}
              />
              <div className="mt-6 flex items-baseline gap-4 border-t border-line pt-5">
                <span aria-hidden className="block bg-walnut h-px w-8" />
                <div className="space-y-2">
                  <h3 className="font-display text-[1.7rem] font-light leading-tight">{t.title}</h3>
                  <p className="text-sm text-ink/75">{t.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/**
 * From land to living: a vertical build line on drafting paper. Each stage is a node on the line,
 * with its photo alternating sides on desktop; the last stage opens into the arch (the home).
 */
export function BuildStages({
  dict,
  images,
}: {
  lang: Locale;
  dict: Dictionary;
  images: string[];
}) {
  const d = dict.construction;
  return (
    <section
      className={cn(
        'relative overflow-hidden border-y border-line bg-cream/50 py-24 sm:py-32',
        BLUEPRINT,
      )}
    >
      <Container>
        <div className="reveal mx-auto mb-16 max-w-3xl space-y-5 text-center sm:mb-24">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <Heading>{d.stagesHeading}</Heading>
        </div>
        <ol className="relative mx-auto max-w-6xl">
          {/* The build line: from a plain rule (land) to an amber one (light, living). */}
          <span
            aria-hidden
            className="absolute bottom-0 left-4 top-0 w-px bg-[linear-gradient(180deg,var(--color-ink)_0%,var(--color-walnut)_55%,var(--color-amber)_100%)] opacity-60 lg:left-1/2"
          />
          {d.stages.map((s, i) => {
            const flip = i % 2 === 1;
            const last = i === d.stages.length - 1;
            return (
              <li
                key={s.title}
                className="reveal relative grid gap-8 pb-20 pl-14 last:pb-0 lg:grid-cols-2 lg:items-center lg:gap-24 lg:pb-24 lg:pl-0"
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-4 top-1 grid size-9 -translate-x-1/2 place-items-center border bg-paper lg:left-1/2 lg:top-1/2',
                    last
                      ? 'rounded-t-full border-amber lg:-translate-y-1/2'
                      : 'border-ink/60 lg:-translate-y-[calc(50%+3rem)]',
                  )}
                >
                  <span className={cn('size-2', last ? 'rounded-full bg-amber' : 'bg-night')} />
                </span>
                <div
                  className={cn(
                    'space-y-4 lg:pt-0',
                    flip ? 'lg:order-2 lg:pl-4' : 'lg:pr-4 lg:text-right',
                  )}
                >
                  <span aria-hidden className="block bg-amber h-px w-8" />
                  <h3 className="font-display text-3xl font-light leading-tight sm:text-4xl">
                    {s.title}
                  </h3>
                  <p
                    className={cn(
                      'max-w-md text-[0.95rem] leading-relaxed text-ink/75',
                      !flip && 'lg:ml-auto',
                    )}
                  >
                    <CopyText>{s.text}</CopyText>
                  </p>
                </div>
                <Picture
                  src={images[i] ?? images[0] ?? ''}
                  alt=""
                  sizes="(min-width: 1024px) 40vw, 85vw"
                  ratio={last ? 'aspect-[4/5]' : 'aspect-[3/2]'}
                  arch={last}
                  className={cn(
                    flip && 'lg:order-1',
                    last && 'w-full lg:max-w-md lg:justify-self-end',
                  )}
                />
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

/** Why one team: dark band with the structure's steel beside four promises. */
export function WhyOneTeam({ dict, image }: { lang: Locale; dict: Dictionary; image: string }) {
  const d = dict.construction;
  return (
    <section className="tone-dark bg-night text-ivory">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[22rem] lg:min-h-full">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover opacity-80 grayscale-[35%]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,var(--color-ink)_100%)] lg:bg-[linear-gradient(90deg,transparent_55%,var(--color-ink)_100%)]"
          />
        </div>
        <div className="px-5 py-20 sm:px-10 lg:px-16 lg:py-32 xl:px-24">
          <div className="reveal space-y-5">
            <Eyebrow className="text-ivory/60">{d.eyebrow}</Eyebrow>
            <Heading>{d.whyHeading}</Heading>
          </div>
          <ul className="mt-12 border-t border-ivory/15">
            {d.why.map((item) => (
              <li
                key={item}
                className="reveal flex items-baseline gap-6 border-b border-ivory/15 py-7"
              >
                <span aria-hidden className="block bg-glow h-px w-8" />
                <span className="font-display text-2xl font-light leading-snug sm:text-[1.9rem]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** No invented portfolio: a visible placeholder until real projects exist. */
export function ConstructionProjects({ dict }: { dict: Dictionary }) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="relative border border-dashed border-walnut/40 px-6 py-16 text-center sm:px-12">
          {/* Corner ticks, like registration marks on a drawing sheet. */}
          {[
            '-left-px -top-px border-l border-t',
            '-right-px -top-px border-r border-t',
            '-bottom-px -left-px border-b border-l',
            '-bottom-px -right-px border-b border-r',
          ].map((pos) => (
            <span key={pos} aria-hidden className={cn('absolute size-5 border-ink', pos)} />
          ))}
          <div className="mx-auto max-w-2xl space-y-6">
            <Heading level="h3">{dict.construction.projectsHeading}</Heading>
            <p>
              <CopyText>{dict.construction.projectsPlaceholder}</CopyText>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** The enquiry: the same calm two-column layout as the design consultation. */
export function StartSection({
  lang,
  dict,
  districts,
}: {
  lang: Locale;
  dict: Dictionary;
  districts: District[];
}) {
  const chat = whatsappHref(fill(dict.premium.chat.message, { item: dict.construction.eyebrow }));
  return (
    <section id="start" className={cn('scroll-mt-24 bg-cream/50 py-24 sm:py-32', BLUEPRINT)}>
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.55fr] lg:gap-20 xl:gap-28">
        <div className="space-y-8 lg:sticky lg:top-40 lg:self-start">
          <div className="space-y-6">
            <Eyebrow>{dict.construction.eyebrow}</Eyebrow>
            <Heading>{dict.build.heading}</Heading>
            <Lead>{dict.build.text}</Lead>
          </div>
          <ol className="hidden grid-cols-2 border-t border-line lg:grid">
            {dict.construction.stages.map((s) => (
              <li
                key={s.title}
                className="flex items-baseline gap-4 border-b border-line py-4 text-sm odd:pr-4"
              >
                <span aria-hidden className="block bg-walnut h-px w-8" />
                <span>{s.title}</span>
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
        <div className="border border-line bg-paper p-6 shadow-[0_30px_80px_-40px_rgba(20,17,15,0.18)] sm:p-10 lg:p-12">
          <BuildForm
            lang={lang}
            districts={districts}
            copy={{
              build: dict.build,
              checkout: dict.checkout,
              bulk: dict.bulk,
              consult: dict.consult,
            }}
          />
        </div>
      </Container>
    </section>
  );
}
