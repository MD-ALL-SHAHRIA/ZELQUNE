import { SAMPLE } from '@/content/sample-images';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { CopyText } from '@/shared/ui/copy-text';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';

/** The making, then how pre-order works in three numbered steps. */
export function Craft({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  const l = dict.landing;
  return (
    <section id="craft" className="scroll-mt-24 bg-cream/70 py-24 sm:py-32">
      <Container className="grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
        <div className="reveal grid grid-cols-[1fr_0.62fr] items-end gap-4">
          <Picture
            src={SAMPLE.craft.src}
            alt=""
            sizes="(min-width: 1024px) 34vw, 60vw"
            ratio="aspect-[3/4]"
          />
          <Picture
            src={SAMPLE.craftDetail.src}
            alt=""
            sizes="(min-width: 1024px) 20vw, 36vw"
            ratio="aspect-[3/4]"
            arch
            className="mb-16"
          />
        </div>
        <div className="flex flex-col justify-center gap-12">
          <div className="reveal space-y-6">
            <Eyebrow>{l.craftEyebrow}</Eyebrow>
            <Heading>{l.craftHeading}</Heading>
            <Lead className="max-w-lg">{l.craftText}</Lead>
          </div>
          <div className="reveal space-y-2">
            <Eyebrow className="mb-6">{l.processEyebrow}</Eyebrow>
            <ol className="divide-y divide-line border-y border-line">
              {l.steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-6">
                  <span className="font-display text-4xl font-light italic text-walnut">
                    {formatNumber(i + 1, lang).padStart(2, lang === 'bn' ? '০' : '0')}
                  </span>
                  <div className="space-y-1">
                    <p className="font-display text-2xl font-light">{step.title}</p>
                    <p className="text-sm text-ink/75">
                      <CopyText>{step.text}</CopyText>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
