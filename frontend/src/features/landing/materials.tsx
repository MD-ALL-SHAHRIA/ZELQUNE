import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { SplitText } from '@/shared/ui/split-text';

/** One close-up per material: wood grain, a warm bulb, clear glass. */
const FALLBACK = { ...SAMPLE.slats, position: 'center' };
const SWATCHES = [
  { ...SAMPLE.slats, position: 'center' },
  { ...SAMPLE.vela, position: 'center 30%' },
  { ...SAMPLE.zenith, position: 'center 30%' },
];

/**
 * Materials as three tall photo panels that open wider on hover or focus, revealing the words
 * (an accordion of light). On phones the panels stack as short cards with the words shown.
 */
export function Materials({ dict }: { dict: Dictionary; lang: Locale }) {
  const m = dict.premium.materials;
  return (
    <section aria-labelledby="materials-heading" className="py-24 sm:py-32 lg:py-44">
      <Container>
        <div className="reveal mx-auto max-w-3xl space-y-6 text-center">
          <Eyebrow>{m.eyebrow}</Eyebrow>
          <Heading id="materials-heading" level="h1">
            <SplitText text={m.heading} />
          </Heading>
        </div>

        {/* Three tall panels side by side; the one under the pointer (or focus) opens wider. On
            phones they stack as short cards. */}
        <ol className="mt-14 flex flex-col gap-3 sm:mt-20 md:h-[36rem] md:flex-row">
          {m.items.map((item, i) => (
            <li
              key={item.title}
              tabIndex={0}
              className="reveal group relative isolate h-72 overflow-hidden bg-sand outline-none transition-[flex-grow] duration-700 ease-out-soft focus-visible:ring-1 focus-visible:ring-walnut md:h-auto md:flex-[1_1_0%] md:hover:flex-[2.2_1_0%] md:focus-visible:flex-[2.2_1_0%]"
            >
              <Image
                src={(SWATCHES[i] ?? FALLBACK).src}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="-z-10 object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-[1.04]"
                style={{ objectPosition: (SWATCHES[i] ?? FALLBACK).position }}
              />
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(43,30,25,0)_40%,rgba(43,30,25,0.88)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-ivory sm:p-8">
                <span aria-hidden className="block h-px w-8 bg-walnut" />
                <p className="mt-4 font-display text-2xl leading-tight sm:text-3xl">{item.title}</p>
                <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-ivory/80 md:max-h-0 md:opacity-0 md:transition-all md:duration-700 md:ease-out-soft md:group-hover:max-h-40 md:group-hover:opacity-100 md:group-focus-visible:max-h-40 md:group-focus-visible:opacity-100">
                  <CopyText>{item.text}</CopyText>
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-[0.7rem] text-stone md:mt-12">
          {dict.landing.sampleNote}
        </p>
      </Container>
    </section>
  );
}
