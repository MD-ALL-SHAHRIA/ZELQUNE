import { splitPlaceholders } from '@/i18n/format';

/**
 * Renders copy with `[[...]]` placeholders highlighted, so unfinished copy is obvious on the page
 * (and in screenshots) instead of silently missing.
 */
export function CopyText({ children }: { children: string }) {
  return (
    <>
      {splitPlaceholders(children).map((part, i) =>
        part.placeholder ? (
          <mark
            key={i}
            data-placeholder
            className="border border-dashed border-walnut bg-glow px-1 text-espresso not-italic"
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
