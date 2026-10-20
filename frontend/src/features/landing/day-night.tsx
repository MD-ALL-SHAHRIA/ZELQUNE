import { SAMPLE } from '@/content/sample-images';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

/** "A vase by day. A soft lamp by night." Two moods of one piece, side by side. */
export function DayNight({ dict }: { dict: Dictionary }) {
  const l = dict.landing;
  const moods = [
    { ...l.day, image: SAMPLE.dayVase, tone: 'bg-cream text-ink' },
    { ...l.night, image: SAMPLE.nightVase, tone: 'bg-ink text-paper' },
  ];
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="reveal mx-auto mb-16 max-w-3xl space-y-5 text-center">
          <Eyebrow>{l.dayNightEyebrow}</Eyebrow>
          <Heading>{l.dayNightHeading}</Heading>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {moods.map((m) => (
            <article key={m.label} className={`reveal group ${m.tone}`}>
              <Picture
                src={m.image.src}
                alt=""
                sizes="(min-width: 768px) 48vw, 100vw"
                ratio="aspect-[4/5]"
              />
              <div className="flex items-baseline gap-6 p-7 sm:p-9">
                <p className="font-display text-4xl font-light italic">{m.label}</p>
                <p className="max-w-sm text-sm leading-relaxed opacity-80">{m.text}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
