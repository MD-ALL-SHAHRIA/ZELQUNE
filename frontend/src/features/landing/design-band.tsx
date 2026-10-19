import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';

/** Interior design services (the second business, after products). */
export function DesignBand({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const h = dict.home2;
  return (
    <section className="bg-cream/70 py-24 sm:py-32">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
        <div className="reveal grid grid-cols-[1fr_0.7fr] items-end gap-4">
          <Picture
            src={SAMPLE.cafeLights.src}
            alt=""
            sizes="(min-width: 1024px) 34vw, 58vw"
            ratio="aspect-[4/5]"
          />
          <Picture
            src={SAMPLE.hotelLobby.src}
            alt=""
            sizes="(min-width: 1024px) 22vw, 38vw"
            ratio="aspect-[3/4]"
            arch
            className="mb-20"
          />
        </div>
        <div className="reveal space-y-7">
          <Eyebrow>{h.designEyebrow}</Eyebrow>
          <Heading>{h.designHeading}</Heading>
          <Lead>{h.designText}</Lead>
          <ul className="flex flex-wrap gap-2">
            {(['HOME', 'OFFICE', 'RESTAURANT_CAFE', 'HOTEL', 'RETAIL'] as const).map((s) => (
              <li key={s} className="border border-ink/20 px-3 py-1.5 text-xs tracking-wide">
                {dict.design.sectors[s].title}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4 pt-2">
            <ButtonLink href={href(lang, '/design')} size="lg">
              {h.designCta}
            </ButtonLink>
            <ButtonLink href={`${href(lang, '/design')}#consult`} size="lg" variant="outline">
              {h.designSecondary}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
