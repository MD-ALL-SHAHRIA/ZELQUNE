import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { SplitText } from '@/shared/ui/split-text';

/**
 * The making: a full-bleed workshop photograph with a paper card stepping over its lower edge,
 * then how pre-order works as three steps laid out across the page on one hairline.
 */
export function Craft({ dict }: { dict: Dictionary; lang: Locale }) {
  const l = dict.landing;
  return (
    <section id="craft" className="scroll-mt-24 bg-cream pb-24 sm:pb-32">
      <div className="media-reveal relative h-[62svh] min-h-[420px] overflow-hidden bg-sand lg:h-[88svh] lg:max-h-[920px]">
        <Image
          src={SAMPLE.craft.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_40%]"
        />
      </div>

      <Container>
        {/* The card overlaps the photo's lower edge. */}
        <div className="reveal relative -mt-28 ml-auto max-w-[40rem] bg-paper p-8 shadow-[0_40px_80px_-40px_rgba(43,30,25,0.35)] sm:-mt-40 sm:p-12 lg:-mt-64 lg:mr-10 lg:p-16">
          <Eyebrow className="mb-6">{l.craftEyebrow}</Eyebrow>
          <Heading level="h1">
            <SplitText text={l.craftHeading} />
          </Heading>
          <Lead className="mt-6 max-w-md">{l.craftText}</Lead>
        </div>

        <div className="mt-20 sm:mt-28">
          <Eyebrow className="reveal mb-10">{l.processEyebrow}</Eyebrow>
          <ol className="grid gap-12 border-t border-ink/20 md:grid-cols-3 md:gap-10">
            {l.steps.map((step) => (
              <li key={step.title} className="reveal relative pt-8 md:pt-10">
                <span
                  aria-hidden
                  className="absolute -top-[5px] left-0 size-[9px] rounded-full border border-walnut bg-cream"
                />
                <span aria-hidden className="block bg-walnut h-px w-8" />
                <p className="mt-6 font-display text-2xl font-medium sm:text-[1.75rem]">
                  {step.title}
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/75">
                  <CopyText>{step.text}</CopyText>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
