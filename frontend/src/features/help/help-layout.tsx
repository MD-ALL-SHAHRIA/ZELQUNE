import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';

import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { CopyText } from '@/shared/ui/copy-text';
import { Container } from '@/shared/ui/typography';

type HelpPage = '/faq' | '/returns' | '/terms' | '/privacy' | '/cookies' | '/track';

/**
 * Help and policy pages share one calm frame: a quiet index of the help pages on the left
 * (sticky on desktop, a swipe strip on phones) and a readable column on the right.
 */
export function HelpLayout({
  lang,
  dict,
  current,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  current: HelpPage;
  children: React.ReactNode;
}) {
  const links: { path: HelpPage; label: string }[] = [
    { path: '/faq', label: dict.faq.title },
    { path: '/returns', label: dict.returns.title },
    { path: '/terms', label: dict.terms.title },
    { path: '/privacy', label: dict.privacy.title },
    { path: '/cookies', label: dict.cookies.title },
    { path: '/track', label: dict.nav.track },
  ];
  return (
    <Container className="grid gap-10 py-12 sm:py-20 lg:grid-cols-[15rem_1fr] lg:gap-20 xl:grid-cols-[18rem_1fr]">
      <nav
        aria-label={dict.layout.columns.help}
        // min-w-0: the link row scrolls inside its own track instead of widening the page.
        className="min-w-0 lg:sticky lg:top-44 lg:self-start"
      >
        <ul className="scrollbar-none -mx-5 flex gap-6 overflow-x-auto border-b border-line px-5 md:mx-0 md:px-0 lg:flex-col lg:gap-0 lg:border-b-0 lg:border-l">
          {links.map((l) => {
            const here = l.path === current;
            return (
              <li key={l.path} className="shrink-0">
                <Link
                  href={href(lang, l.path)}
                  aria-current={here ? 'page' : undefined}
                  className={cn(
                    'relative block py-3 text-sm transition-colors lg:-ml-px lg:border-l lg:py-2.5 lg:pl-5',
                    here
                      ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink lg:border-ink lg:after:hidden'
                      : 'text-ink/60 hover:text-ink lg:border-transparent',
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </Container>
  );
}

/** Numbered policy clauses; [[...]] placeholders stay visible. */
export function Clauses({ items }: { lang: Locale; items: string[] }) {
  return (
    <ol className="border-t border-line">
      {items.map((item) => (
        <li
          key={item}
          className="grid grid-cols-[2.75rem_1fr] gap-4 border-b border-line py-7 text-[1.05rem] leading-relaxed sm:grid-cols-[4rem_1fr] sm:text-lg"
        >
          <span aria-hidden className="block bg-walnut h-px w-8" />
          <span>
            <CopyText>{item}</CopyText>
          </span>
        </li>
      ))}
    </ol>
  );
}
