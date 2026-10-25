import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill } from '@/i18n/format';
import { cn } from '@/shared/lib/cn';
import { whatsappHref } from '@/shared/lib/whatsapp';

/**
 * Floating "Chat on WhatsApp" link (server-rendered, no client JS). Renders nothing until
 * NEXT_PUBLIC_WHATSAPP_NUMBER is set.
 *
 * Placement: bottom-right, lifted by `--sticky-bar-h` so it never covers a bottom sticky bar
 * (the product page purchase bar on phones). Mark that bar with `data-sticky-bar` (globals.css
 * then sets the offset to 4.5rem below lg) or set `--sticky-bar-height` on it / `--sticky-bar-h`
 * on :root to its exact height.
 */
export function WhatsappFab({
  dict,
  item = 'Zelqune',
  number,
}: {
  dict: Dictionary;
  item?: string;
  /** The owner's WhatsApp number from the dashboard (env default otherwise). */
  number?: string | null;
}) {
  const href = whatsappHref(fill(dict.premium.chat.message, { item }), number);
  if (!href) return null;
  return <WhatsappFabLink href={href} label={dict.premium.chat.label} />;
}

export function WhatsappFabLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-testid="whatsapp-fab"
      className={cn(
        'no-print fixed right-4 z-20 flex h-14 items-center rounded-full tone-dark bg-night text-ivory',
        'bottom-[calc(1rem+var(--sticky-bar-h,0px)+env(safe-area-inset-bottom,0px))] sm:right-6 sm:bottom-[calc(1.5rem+var(--sticky-bar-h,0px)+env(safe-area-inset-bottom,0px))]',
        'shadow-[0_14px_34px_-14px_rgba(43,30,25,0.55)] ring-1 ring-ivory/20',
        'transition-[background-color,translate,bottom] duration-500 ease-out-soft hover:-translate-y-0.5 hover:bg-walnut',
        'animate-[fade-up_800ms_var(--ease-out-soft)_1.2s_both]',
        className,
      )}
    >
      <span className="grid size-14 shrink-0 place-items-center">
        <WhatsappGlyph className="size-[1.4rem]" />
      </span>
      {/* Label on wide screens only; phones get the icon (the link keeps its aria-label). */}
      <span
        aria-hidden
        className="hidden pr-6 -ml-1 text-[0.72rem] font-medium uppercase tracking-[0.16em] whitespace-nowrap lg:block [:lang(bn)_&]:text-[0.9rem] [:lang(bn)_&]:tracking-normal"
      >
        {label}
      </span>
    </a>
  );
}

/** WhatsApp's speech-bubble mark, drawn in the current colour (1.25px line, our icon weight). */
function WhatsappGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <path
        d="M3.6 20.4l1.2-4.3A8.6 8.6 0 1 1 8 19.3l-4.4 1.1z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 7.9c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5 0l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .5-.2 1.3-1 1.7-.7.4-1.8.5-3.6-.4a9 9 0 0 1-3.4-3.3c-.8-1.4-.9-2.5-.6-3.3z"
        fill="currentColor"
      />
    </svg>
  );
}
