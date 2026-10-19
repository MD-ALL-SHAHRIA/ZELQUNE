import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { Accordion } from '@/shared/ui/accordion';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

export function FaqPreview({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <section className="py-24 sm:py-32 lg:py-36">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:items-start lg:gap-24">
        <div className="reveal space-y-6 lg:sticky lg:top-32">
          <Eyebrow>{dict.nav.faq}</Eyebrow>
          <Heading>{dict.faq.title}</Heading>
          <ButtonLink href={href(lang, '/faq')} variant="outline">
            {dict.nav.faq}
          </ButtonLink>
        </div>
        <div className="reveal">
          <Accordion
            items={dict.faq.items
              .slice(0, 5)
              .map((item, i) => ({ id: `faq-${i}`, title: item.q, body: item.a }))}
          />
        </div>
      </Container>
    </section>
  );
}
