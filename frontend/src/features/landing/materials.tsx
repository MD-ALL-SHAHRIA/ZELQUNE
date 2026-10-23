import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { numeral } from './numeral';

/** One close-up per material: wood grain, a warm bulb, clear glass. */
const FALLBACK = { ...SAMPLE.slats, position: 'center' };
const SWATCHES = [
  { ...SAMPLE.slats, position: 'center' },
  { ...SAMPLE.vela, position: 'center 30%' },
  { ...SAMPLE.zenith, position: 'center 30%' },
];

/**
 * Materials as a centred specimen sheet: three arch-cropped close-ups like samples pinned to a
 * board, separated by hairlines. On phones each material becomes an index row (small arch beside
 * the words) so the section stays short.
 */
export function Materials({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const m = dict.premium.materials;
  return (
    <section aria-labelledby="materials-heading" className="py-24 sm:py-32 lg:py-44">
      <Container>
        <div className="reveal mx-auto max-w-3xl space-y-6 text-center">
          <Eyebrow>{m.eyebrow}</Eyebrow>
          <Heading id="materials-heading" level="h1">
            {m.heading}
          </Heading>
        </div>

        <ol className="mt-14 border-t border-line sm:mt-20 md:grid md:grid-cols-3 md:border-t-0">
          {m.items.map((item, i) => (
            <li
              key={item.title}
              className={cn(
                'reveal grid grid-cols-[6.5rem_1fr] items-center gap-6 border-b border-line py-7',
                'md:flex md:flex-col md:items-center md:gap-0 md:border-b-0 md:px-8 md:py-0 md:text-center lg:px-14',
                i > 0 && 'md:border-l',
              )}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[999px] bg-sand md:w-[78%] md:max-w-[300px]">
                <Image
                  src={(SWATCHES[i] ?? FALLBACK).src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 24vw, 104px"
                  className="object-cover"
                  style={{ objectPosition: (SWATCHES[i] ?? FALLBACK).position }}
                />
              </div>
              <div className="md:mt-10">
                <span className="block font-display text-base italic text-walnut [:lang(bn)_&]:not-italic">
                  {numeral(i + 1, lang)}
                </span>
                <p className="mt-2 font-display text-2xl font-light leading-tight sm:text-3xl md:mt-3">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70 md:mx-auto md:mt-4 md:max-w-[17rem]">
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
