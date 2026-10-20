import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

/** Bulk & Corporate invitation (section 5ক). */
export function BusinessBand({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      <Image
        src={SAMPLE.office.src}
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-45"
      />
      <Container className="grid gap-10 py-28 lg:grid-cols-2 lg:py-36">
        <div className="reveal space-y-6">
          <Eyebrow className="text-paper/70">{dict.landing.businessEyebrow}</Eyebrow>
          <Heading>{dict.bulk.heading}</Heading>
          <p className="max-w-lg text-paper/85">{dict.home.bulkBanner}</p>
          <ul className="flex flex-wrap gap-2 pt-2">
            {dict.bulk.whoOrders.map((who) => (
              <li key={who} className="border border-paper/30 px-3 py-1.5 text-xs tracking-wide">
                {who}
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <ButtonLink
              href={href(lang, '/bulk')}
              size="lg"
              className="bg-paper text-ink hover:bg-glow"
            >
              {dict.home.bulkBannerCta}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
