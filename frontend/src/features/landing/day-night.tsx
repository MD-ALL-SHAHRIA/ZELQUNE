import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { Eyebrow, Heading } from '@/shared/ui/typography';
import { SplitText } from '@/shared/ui/split-text';

/**
 * "A vase by day. A soft lamp by night." A full-bleed split, edge to edge: daylight on cream to
 * the left, the lamp glow on ink to the right, the heading sitting on the seam.
 */
export function DayNight({ dict }: { dict: Dictionary }) {
  const l = dict.landing;
  const moods = [
    { ...l.day, image: SAMPLE.dayVase, night: false },
    { ...l.night, image: SAMPLE.nightVase, night: true },
  ];
  return (
    <section className="relative isolate bg-night">
      <div className="grid md:grid-cols-2">
        {moods.map((m) => (
          <article
            key={m.label}
            className={cn(
              'relative isolate flex min-h-[78svh] flex-col justify-end overflow-hidden md:min-h-[92svh]',
              m.night ? 'tone-dark bg-night text-ivory' : 'bg-cream text-ink',
            )}
          >
            <Image
              src={m.image.src}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="-z-10 object-cover"
            />
            <div
              aria-hidden
              className={cn(
                'absolute inset-0 -z-10',
                m.night
                  ? 'bg-[radial-gradient(70%_55%_at_50%_45%,rgba(246,201,135,0.22),transparent_70%),linear-gradient(180deg,rgba(43,30,25,0.1)_40%,rgba(43,30,25,0.85)_100%)]'
                  : 'bg-[linear-gradient(180deg,rgba(243,236,225,0)_40%,rgba(243,236,225,0.92)_100%)]',
              )}
            />
            <div className="reveal flex flex-wrap items-end gap-x-8 gap-y-3 p-6 pb-10 sm:p-10 lg:p-14">
              <p
                className={cn(
                  'font-display text-[5.5rem] font-medium italic leading-[0.8] sm:text-[8rem] lg:text-[10rem] [:lang(bn)_&]:not-italic [:lang(bn)_&]:leading-none',
                  m.night && 'text-glow',
                )}
              >
                {m.label}
              </p>
              <p
                className={cn(
                  'max-w-[16rem] pb-2 text-sm leading-relaxed',
                  m.night ? 'text-ivory/80' : 'text-ink/80',
                )}
              >
                {m.text}
              </p>
            </div>
          </article>
        ))}
      </div>
      {/* Heading on the seam (top on phones, centre on wider screens). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-5 pt-14 md:pt-20">
        <div className="reveal max-w-[46rem] bg-paper/90 px-7 py-8 text-center backdrop-blur-sm sm:px-12 sm:py-10">
          <Eyebrow className="mb-4">{l.dayNightEyebrow}</Eyebrow>
          <Heading level="h3" className="sm:text-[2.4rem]">
            <SplitText text={l.dayNightHeading} />
          </Heading>
        </div>
      </div>
      <p className="absolute bottom-3 right-4 text-[0.6rem] text-ivory/55">{l.sampleNote}</p>
    </section>
  );
}
