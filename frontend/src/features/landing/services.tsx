import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { numeral } from './numeral';

const SECTORS = ['HOME', 'OFFICE', 'RESTAURANT_CAFE', 'HOTEL', 'RETAIL'] as const;

function More({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.8rem] font-medium uppercase tracking-[0.16em] [:lang(bn)_&]:text-[0.95rem]">
      {label}
      <ArrowUpRight
        aria-hidden
        strokeWidth={1.25}
        className="size-4 transition-transform duration-500 ease-out-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </span>
  );
}

/**
 * Services as a statement and a bento of three panels, each with its own composition:
 * Interior Design tall with the text at its foot, Construction wide with the text at its head,
 * Bulk & Corporate as a walnut split.
 */
export function Services({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const s = dict.services;
  const more = dict.design.explore;
  return (
    <section className="bg-ink py-24 text-paper sm:py-32 lg:py-40">
      <Container>
        <div className="reveal mb-14 grid gap-8 lg:mb-20 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-9">
            <Eyebrow className="mb-6 text-paper/60">{s.eyebrow}</Eyebrow>
            <Heading level="display" className="max-w-[14ch] [:lang(bn)_&]:max-w-[16ch]">
              {s.heading}
            </Heading>
          </div>
          <div aria-hidden className="hidden h-px bg-paper/25 lg:col-span-3 lg:mb-6 lg:block" />
        </div>

        <div className="grid gap-4 lg:h-[min(88svh,920px)] lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
          {/* 01 Interior Design: tall, text at the foot. */}
          <Link
            href={href(lang, '/design')}
            className="reveal group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden bg-walnut sm:aspect-[4/3] lg:col-span-7 lg:row-span-2 lg:aspect-auto"
          >
            <Image
              src={SAMPLE.livingNeutral.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="-z-10 object-cover transition-transform duration-[1.8s] ease-out-soft group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(53,58,48,0)_35%,rgba(53,58,48,0.82)_100%)]" />
            <span className="absolute left-6 top-6 font-display text-lg italic text-paper/85 sm:left-10 sm:top-9">
              {numeral(1, lang)}
            </span>
            <div className="space-y-5 p-6 sm:p-10">
              <h3 className="font-display text-[2.6rem] font-light leading-none sm:text-6xl lg:text-7xl [:lang(bn)_&]:leading-tight">
                {s.design.title}
              </h3>
              <p className="max-w-md text-paper/85">{s.design.text}</p>
              <ul className="hidden flex-wrap gap-x-5 gap-y-1 border-t border-paper/25 pt-4 text-sm text-paper/75 sm:flex">
                {SECTORS.map((k) => (
                  <li key={k}>{dict.design.sectors[k].title}</li>
                ))}
              </ul>
              <More label={more} />
            </div>
          </Link>

          {/* 02 Construction: wide, text at the head. */}
          <Link
            href={href(lang, '/construction')}
            className="reveal group relative isolate flex aspect-square flex-col justify-start sm:aspect-[16/10] overflow-hidden bg-walnut lg:col-span-5 lg:aspect-auto"
          >
            <Image
              src={SAMPLE.villa.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="-z-10 object-cover transition-transform duration-[1.8s] ease-out-soft group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(53,58,48,0)_38%,rgba(53,58,48,0.55)_62%,rgba(53,58,48,0.88)_100%)]" />
            <div className="flex items-start justify-between gap-6 p-6 sm:p-9">
              <div className="space-y-3">
                <h3 className="font-display text-4xl font-light leading-none sm:text-5xl [:lang(bn)_&]:leading-tight">
                  {s.construction.title}
                </h3>
                <p className="max-w-xs text-sm text-paper/85">{s.construction.text}</p>
                <div className="pt-2">
                  <More label={more} />
                </div>
              </div>
              <span className="font-display text-lg italic text-paper/85">{numeral(2, lang)}</span>
            </div>
          </Link>

          {/* 03 Bulk & Corporate: a walnut split, photo beside the words. */}
          <Link
            href={href(lang, '/bulk')}
            className="reveal group grid overflow-hidden bg-walnut sm:grid-cols-[1fr_1.1fr] lg:col-span-5"
          >
            <div className="relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-[260px] lg:min-h-0">
              <Image
                src={SAMPLE.office.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 19vw, (min-width: 640px) 46vw, 100vw"
                className="object-cover transition-transform duration-[1.8s] ease-out-soft group-hover:scale-[1.04]"
              />
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
              <span className="font-display text-lg italic text-glow">{numeral(3, lang)}</span>
              <div className="space-y-3">
                <h3 className="font-display text-3xl font-light leading-[1.05] sm:text-4xl [:lang(bn)_&]:leading-tight">
                  {s.bulk.title}
                </h3>
                <p className="text-sm text-paper/80">{s.bulk.text}</p>
              </div>
              <More label={more} />
            </div>
          </Link>
        </div>
      </Container>
    </section>
  );
}
