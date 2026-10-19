import { splitPlaceholders } from '@/i18n/format';

/**
 * Renders copy with `[[...]]` placeholders highlighted, so unfinished copy is obvious on the page
 * (and in screenshots) instead of silently missing.
 */
export function Text({ children }: { children: string }) {
  return (
    <>
      {splitPlaceholders(children).map((part, i) =>
        part.placeholder ? (
          <mark
            key={i}
            data-placeholder
            className="rounded-sm border border-dashed border-amber bg-amber/20 px-1 text-ink"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
