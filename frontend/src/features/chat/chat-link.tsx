import { MessageCircle } from 'lucide-react';

/** Inline "chat on WhatsApp" text link; renders nothing when no business number is set. */
export function ChatLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 text-sm underline decoration-ink/30 underline-offset-[6px] transition hover:decoration-ink"
    >
      <MessageCircle aria-hidden className="size-4" strokeWidth={1.3} />
      {label}
    </a>
  );
}
