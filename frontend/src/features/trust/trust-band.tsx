import { BadgeCheck, Banknote, ShieldCheck, Undo2 } from 'lucide-react';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

const ICONS = [Banknote, Undo2, ShieldCheck, BadgeCheck];

/**
 * "Buy with confidence": the four promises from the terms (COD after a ৳300 advance, refund if
 * late, damage covered, made in Dhaka). Shared by home, product and service pages. Facts only.
 */
export function TrustBand({
  dict,
  tone = 'light',
  className,
}: {
  dict: Dictionary;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const t = dict.premium.trust;
  const dark = tone === 'dark';
  return (
    <section
      aria-labelledby="trust-heading"
      className={cn(dark ? 'bg-night text-ivory' : 'bg-cream/60', className)}
    >
      <Container className="grid gap-12 py-16 md:py-20 lg:grid-cols-[1fr_2.2fr] lg:gap-20">
        <div className="space-y-4">
          <Eyebrow className={dark ? 'text-ivory/60' : undefined}>{t.eyebrow}</Eyebrow>
          <Heading id="trust-heading" level="h2">
            {t.heading}
          </Heading>
        </div>
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {t.items.map((item, i) => {
            const Icon = ICONS[i] ?? BadgeCheck;
            return (
              <li
                key={item.title}
                className={cn('flex gap-5 border-t pt-6', dark ? 'border-ivory/15' : 'border-line')}
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.1}
                  className={cn('mt-1 size-6 shrink-0', dark ? 'text-glow' : 'text-walnut')}
                />
                <div className="space-y-2">
                  <p className="font-display text-2xl font-light leading-tight">{item.title}</p>
                  <p
                    className={cn('text-sm leading-relaxed', dark ? 'text-ivory/70' : 'text-stone')}
                  >
                    <CopyText>{item.text}</CopyText>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
