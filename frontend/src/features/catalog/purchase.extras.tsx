import { Banknote, MessageCircle, ShieldCheck, Undo2 } from 'lucide-react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { cn } from '@/shared/lib/cn';
import { CopyText } from '@/shared/ui/copy-text';
import { timelineSteps } from './product-copy';

const PROMISE_ICONS = [Banknote, Undo2, ShieldCheck];

/**
 * "Buy with confidence" as one compact card right under the delivery card (Apex pattern: trust
 * information visible at the moment of decision): a heading, then the three promises side by side
 * with their short explanations. Server-rendered, no JavaScript.
 */
export function ConfidenceCard({ dict }: { dict: Dictionary }) {
  const items = dict.premium.trust.items.slice(0, PROMISE_ICONS.length);
  return (
    <section aria-labelledby="buy-with-confidence" className="bg-cream/70 p-5">
      <h2
        id="buy-with-confidence"
        className="flex items-center gap-2.5 text-[0.95rem] font-medium text-ink"
      >
        <ShieldCheck aria-hidden strokeWidth={1.4} className="size-[1.15rem] text-walnut" />
        {dict.premium.trust.heading}
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {items.map((item, i) => {
          const Icon = PROMISE_ICONS[i]!;
          return (
            <li key={item.title} className="flex gap-3 sm:block sm:px-4 sm:first:pl-0 sm:last:pr-0">
              <Icon
                aria-hidden
                strokeWidth={1.3}
                className="mt-0.5 size-4 shrink-0 text-walnut sm:mb-2 sm:mt-0"
              />
              <span>
                <span className="block text-[0.82rem] font-medium leading-snug text-ink">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink/65">
                  <CopyText>{item.text}</CopyText>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
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
  bare = false,
}: {
  dict: Dictionary;
  lang: Locale;
  leadTimeDays: number | null | undefined;
  /** Inside an accordion that already says "Made for you": no own heading or panel. */
  bare?: boolean;
}) {
  const steps = timelineSteps(dict.premium.timeline, leadTimeDays, lang);
  return (
    <section
      aria-labelledby={bare ? undefined : 'made-for-you'}
      className={bare ? 'pt-1' : 'bg-cream/55 px-5 pb-6 pt-5'}
    >
      {bare ? null : (
        <h2
          id="made-for-you"
          className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
        >
          {dict.premium.madeForYou}
        </h2>
      )}
      <ol className={cn('relative grid grid-cols-3 gap-3', bare ? 'mt-2' : 'mt-5')}>
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
