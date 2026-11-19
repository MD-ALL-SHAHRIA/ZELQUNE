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

/** A small lit niche (the brand's arch with a lamp in it) between promises. */
function ArchMark() {
  return (
    <svg aria-hidden viewBox="0 0 14 18" className="h-[1.1rem] w-[0.85rem] shrink-0 text-brass">
      <path d="M1 17.5V7a6 6 0 0 1 12 0v10.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="7" cy="9" r="1.6" fill="currentColor" className="ribbon-lamp" />
    </svg>
  );
}

/**
 * The promise ribbon under the hero: the hero's own espresso, carried on below a brass rule, where the four promises (handcrafted,
 * safe 5V light, the advance, delivery across Bangladesh) glide by in large serif, each with the
 * owner's icon, divided by small brass arches. It holds still under the pointer, rests off
 * screen (data-loop), and with reduced motion is a still row you swipe. Screen readers get the
 * promises once, as a list.
 */
export function TrustStrip({ dict, icons }: { dict: Dictionary; icons?: string[] }) {
  const items = dict.landing.values.map((v, i) => ({
    ...v,
    Icon: (icons?.[i] && BY_NAME[icons[i]]) || ICONS[i] || Hammer,
  }));
  // One run is the promises twice, so a run is always wider than the widest screen.
  const run = (copy: boolean) => (
    <div aria-hidden className="flex shrink-0 items-center">
      {[...items, ...items].map(({ title, text, Icon }, k) => (
        <span key={`${copy ? 'b' : 'a'}${k}`} className="flex shrink-0 items-center">
          <span className="flex items-baseline gap-3 px-7 sm:px-10">
            <Icon
              className="size-[1.05rem] shrink-0 translate-y-[0.1rem] text-brass sm:size-5"
              strokeWidth={1.2}
            />
            <span className="whitespace-nowrap font-display text-[1.45rem] font-medium leading-none text-ivory sm:text-[2rem] [:lang(bn)_&]:font-normal">
              {title}
            </span>
            <span className="whitespace-nowrap font-display text-[1.15rem] italic leading-none text-ivory/65 sm:text-[1.45rem] [:lang(bn)_&]:not-italic">
              {text}
            </span>
          </span>
          <ArchMark />
        </span>
      ))}
    </div>
  );
  return (
    <section
      aria-label={dict.premium.trust.eyebrow}
      data-loop
      className="ribbon tone-dark relative overflow-clip border-t border-brass/30 bg-espresso py-6 sm:py-8"
    >
      <ul className="sr-only">
        {items.map((v) => (
          <li key={v.title}>
            {v.title}: {v.text}
          </li>
        ))}
      </ul>
      <div className="ribbon-track">
        <div className="loop-run flex w-max">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </section>
  );
}
