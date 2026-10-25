import { Plus } from 'lucide-react';
import { CopyText } from './copy-text';

/**
 * Quiet accordion on native <details>/<summary>: accessible, keyboard friendly and zero client
 * JavaScript (FAQ, product details).
 */
export function Accordion({
  items,
  defaultOpen,
}: {
  items: { id: string; title: string; body: React.ReactNode }[];
  defaultOpen?: string;
}) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details
          key={item.id}
          open={item.id === defaultOpen}
          className="group border-b border-line [&::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-xl font-medium sm:text-2xl">{item.title}</span>
            <Plus
              aria-hidden
              strokeWidth={1.25}
              className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45"
            />
          </summary>
          <div className="pb-6 pr-10 text-ink/80">
            {typeof item.body === 'string' ? <CopyText>{item.body}</CopyText> : item.body}
          </div>
        </details>
      ))}
    </div>
  );
}
