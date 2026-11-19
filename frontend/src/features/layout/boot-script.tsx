'use client';

/**
 * A script that must run before the first paint (saved theme, intro flag). It runs from the
 * server HTML. When React creates it in the browser instead (switching language swaps the root
 * layout), the work is already done, so it renders as an inert data block: React warns about
 * executable scripts it creates, and would not run them anyway.
 */
export function BootScript({ code }: { code: string }) {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === 'undefined' ? undefined : 'text/plain'}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
