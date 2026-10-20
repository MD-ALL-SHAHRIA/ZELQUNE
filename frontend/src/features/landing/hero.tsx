import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

/** Full-bleed editorial hero (RH scale, warm Zelqune light). */
export function Hero({
  lang,
  dict,
  productSlug,
  pricePaisa,
}: {
  lang: Locale;
  dict: Dictionary;
  productSlug?: string;
  pricePaisa?: number;
}) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-6.5rem)] items-end overflow-hidden bg-ink text-paper">
      <Image
        src={SAMPLE.hero.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[60%_center]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,18,15,0.05)_0%,rgba(22,18,15,0.15)_45%,rgba(22,18,15,0.78)_100%)]"
      />
      <Container className="pb-14 pt-32 sm:pb-20 lg:pb-24">
        <div className="max-w-3xl space-y-6">
          <Eyebrow className="text-paper/75">{dict.landing.heroEyebrow}</Eyebrow>
          <Heading as="h1" level="display">
            {dict.home.heroHeading}
          </Heading>
          <p className="max-w-xl text-base leading-relaxed text-paper/85 sm:text-lg">
            {dict.home.heroSubline}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {productSlug ? (
              <ButtonLink
                href={href(lang, `/products/${productSlug}`)}
                size="lg"
                className="bg-paper text-ink hover:bg-glow"
              >
                {dict.home.cta}
                {pricePaisa ? (
                  <span className="border-l border-ink/25 pl-3 normal-case tracking-normal">
                    {formatTaka(pricePaisa, lang)}
                  </span>
                ) : null}
              </ButtonLink>
            ) : null}
            <ButtonLink href="#craft" variant="light" size="lg">
              {dict.landing.heroSecondary}
            </ButtonLink>
          </div>
        </div>
      </Container>
      <p className="absolute bottom-3 right-4 text-[0.6rem] text-paper/50">
        {dict.landing.sampleNote}
      </p>
    </section>
  );
}
