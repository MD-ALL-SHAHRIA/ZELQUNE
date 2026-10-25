import {
  Hammer,
  Hand,
  HandCoins,
  Leaf,
  Lightbulb,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { Container } from '@/shared/ui/typography';

const ICONS = [Hammer, Lightbulb, HandCoins, Truck];
/** The owner's icon choices (dashboard) by name. */
const BY_NAME: Record<string, LucideIcon> = {
  hammer: Hammer,
  lightbulb: Lightbulb,
  coins: HandCoins,
  truck: Truck,
  leaf: Leaf,
  shield: ShieldCheck,
  hand: Hand,
  sparkles: Sparkles,
};

/**
 * The slim promise strip under the hero (owner's reference): four facts from the copy
 * (handcrafted, safe 5V light, ৳300 advance, delivery across Bangladesh), each an icon, a small
 * title and one line, divided by hairlines. A 2×2 grid on phones.
 */
export function TrustStrip({ dict, icons }: { dict: Dictionary; icons?: string[] }) {
  return (
    <section aria-label={dict.premium.trust.eyebrow} className="border-b border-line bg-cream">
      <Container>
        <ul className="grid grid-cols-2 lg:grid-flow-col lg:auto-cols-fr">
          {dict.landing.values.map((v, i) => {
            const Icon = (icons?.[i] && BY_NAME[icons[i]]) || ICONS[i] || Hammer;
            return (
              <li
                key={v.title}
                className="reveal flex items-center gap-4 border-line px-2 py-6 odd:border-r sm:px-6 lg:justify-center lg:border-r lg:py-8 lg:last:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0"
              >
                <Icon aria-hidden className="size-6 shrink-0 text-walnut" strokeWidth={1.1} />
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-ink [:lang(bn)_&]:text-[0.85rem] [:lang(bn)_&]:tracking-normal">
                    {v.title}
                  </p>
                  <p className="mt-1 text-[0.8rem] leading-snug text-stone">{v.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
