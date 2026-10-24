import { Banknote, MessageCircle, ShieldCheck, Undo2 } from 'lucide-react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { CopyText } from '@/shared/ui/copy-text';
import { timelineSteps } from './product-copy';

const PROMISE_ICONS = [Banknote, Undo2, ShieldCheck];

/**
 * Three promises right under the buy button (cash on delivery, refund if late, damage covered),
 * the short form of the trust band further down. Server-rendered, no JavaScript.
 */
export function BuyPromises({ dict }: { dict: Dictionary }) {
  const items = dict.premium.trust.items.slice(0, PROMISE_ICONS.length);
  return (
    <ul className="grid grid-cols-3 divide-x divide-line border-y border-line">
      {items.map((item, i) => {
        const Icon = PROMISE_ICONS[i]!;
        return (
          <li
            key={item.title}
            className="flex flex-col items-center gap-2.5 px-2 py-4 text-center sm:px-3"
          >
            <Icon aria-hidden strokeWidth={1.1} className="size-5 text-walnut" />
            <span className="text-[0.74rem] leading-snug text-ink/85 [:lang(bn)_&]:text-[0.8rem]">
              {item.title}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** "Chat on WhatsApp" with the product named in the message (only when a number is set). */
export function ChatLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center gap-2.5 border border-line px-4 py-3.5 text-sm transition-colors duration-300 hover:border-ink"
    >
      <MessageCircle aria-hidden strokeWidth={1.25} className="size-[1.1rem] text-[#1f8a4c]" />
      <span className="underline-offset-4 group-hover:underline">{label}</span>
    </a>
  );
}

/** "Made for you": three calm steps from reservation to the door. */
export function MadeForYou({
  dict,
  lang,
  leadTimeDays,
}: {
  dict: Dictionary;
  lang: Locale;
  leadTimeDays: number | null | undefined;
}) {
  const steps = timelineSteps(dict.premium.timeline, leadTimeDays, lang);
  return (
    <section aria-labelledby="made-for-you" className="bg-cream/55 px-5 pb-6 pt-5">
      <h2
        id="made-for-you"
        className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
      >
        {dict.premium.madeForYou}
      </h2>
      <ol className="relative mt-5 grid grid-cols-3 gap-3">
        {/* The thread joining the three steps. */}
        <span aria-hidden className="absolute left-1 right-[30%] top-[5px] h-px bg-walnut/25" />
        {steps.map((step, i) => (
          <li key={step.title} className="relative space-y-1.5">
            <span
              aria-hidden
              className={cn(
                'relative block size-[11px] rounded-full border',
                i === 0 ? 'border-amber bg-amber' : 'border-walnut/40 bg-paper',
              )}
            />
            <p className="pt-2 font-display text-lg font-medium leading-tight [:lang(bn)_&]:text-base [:lang(bn)_&]:font-normal">
              {step.title}
            </p>
            <p className="text-xs leading-snug text-ink/70">
              <CopyText>{step.text}</CopyText>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
