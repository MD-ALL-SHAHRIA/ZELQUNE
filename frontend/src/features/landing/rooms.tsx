import { SAMPLE } from '@/content/sample-images';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

/** Inspiration strip: swipeable on mobile (scroll-snap), a grid on desktop. */
export function Rooms({ dict }: { dict: Dictionary }) {
  const l = dict.landing;
  const rooms = [
    { label: l.rooms.living, image: SAMPLE.living },
    { label: l.rooms.bedroom, image: SAMPLE.bedroom },
    { label: l.rooms.cafe, image: SAMPLE.cafe },
    { label: l.rooms.office, image: SAMPLE.office },
  ];
  return (
    <section className="py-24 sm:py-32">
      <Container className="reveal mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-5">
          <Eyebrow>{l.roomsEyebrow}</Eyebrow>
          <Heading>{l.roomsHeading}</Heading>
        </div>
      </Container>
      <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:px-10 lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-4 lg:overflow-visible">
        {rooms.map((r) => (
          <figure
            key={r.label}
            className="reveal w-[78vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto"
          >
            <Picture
              src={r.image.src}
              alt={r.label}
              sizes="(min-width: 1024px) 24vw, 78vw"
              ratio="aspect-[3/4]"
            />
            <figcaption className="mt-4 font-display text-2xl font-light">{r.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
