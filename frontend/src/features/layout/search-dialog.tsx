'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { fill } from '@/i18n/format';
import { cn } from '@/shared/lib/cn';
import { navLabel } from './header-styles';
import { search, type SearchIndex } from './search';
import type { SearchCopy } from './search-button';

/** With an empty query the overlay suggests a few pieces and every service page. */
const SUGGESTED_PRODUCTS = 6;

export function SearchDialog({
  open,
  onOpenChange,
  index,
  copy,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  index: SearchIndex;
  copy: SearchCopy;
}) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const q = query;

  const results = useMemo(() => {
    const found = search(index, q);
    return q.trim() ? found : { ...found, products: found.products.slice(0, SUGGESTED_PRODUCTS) };
  }, [index, q]);
  const flat = [...results.products, ...results.pages];
  const current = Math.min(active, Math.max(flat.length - 1, 0));
  const optionId = (i: number) => `${id}-option-${i}`;

  const close = () => onOpenChange(false);
  const go = (target: string) => {
    close();
    router.push(target);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!flat.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = (current + step + flat.length) % flat.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flat[current];
      if (hit) go(hit.href);
    }
  };

  const option = (i: number) => ({
    id: optionId(i),
    role: 'option' as const,
    'aria-selected': i === current,
    onMouseMove: () => setActive(i),
    onClick: close,
  });
  const empty = !flat.length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_300ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
            input.current?.select();
          }}
          className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-paper shadow-[0_30px_80px_rgba(43,30,25,0.16)] transition-[opacity,translate] duration-500 ease-out-soft starting:-translate-y-4 starting:opacity-0 sm:max-h-[min(88dvh,52rem)]"
        >
          <Dialog.Title className="sr-only">{copy.search}</Dialog.Title>
          <div className="border-b border-line">
            <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center gap-3 px-5 md:px-10 lg:h-28 lg:gap-6">
              <Search
                aria-hidden
                className="size-5 shrink-0 text-stone lg:size-6"
                strokeWidth={1.1}
              />
              <input
                ref={input}
                type="search"
                role="combobox"
                aria-label={copy.search}
                aria-expanded={!empty}
                aria-controls={`${id}-results`}
                aria-autocomplete="list"
                aria-activedescendant={empty ? undefined : optionId(current)}
                autoComplete="off"
                enterKeyHint="go"
                spellCheck={false}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={copy.placeholder}
                className="min-w-0 flex-1 bg-transparent font-display text-[1.35rem] font-medium leading-none text-ink outline-none placeholder:text-stone/60 focus-visible:outline-none sm:text-4xl lg:text-5xl [&::-webkit-search-cancel-button]:hidden"
              />
              <Dialog.Close
                aria-label={copy.close}
                className="-mr-2 grid size-10 shrink-0 place-items-center text-ink transition-opacity hover:opacity-55"
              >
                <X className="size-5" strokeWidth={1.1} />
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div
              id={`${id}-results`}
              role="listbox"
              aria-label={copy.search}
              className="mx-auto grid w-full max-w-[1440px] gap-x-16 gap-y-10 px-5 py-8 md:px-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:py-12"
            >
              {empty ? (
                <p
                  role="presentation"
                  className="font-display text-2xl font-medium text-stone lg:col-span-2"
                >
                  {fill(copy.empty, { q: query.trim() })}
                </p>
              ) : null}

              {results.products.length ? (
                <section role="group" aria-labelledby={`${id}-products`}>
                  <GroupHeading id={`${id}-products`}>{copy.products}</GroupHeading>
                  <ul role="presentation" className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
                    {results.products.map((p, i) => (
                      <li key={p.href} role="presentation">
                        <Link
                          href={p.href}
                          {...option(i)}
                          className={cn(
                            'group -mx-3 flex items-center gap-4 border-b border-line/70 px-3 py-3 transition-colors duration-200',
                            i === current && 'bg-cream',
                            !q.trim() && i >= 3 && 'max-sm:hidden',
                          )}
                        >
                          <span className="relative block h-[4.5rem] w-14 shrink-0 overflow-hidden bg-sand">
                            {p.image ? (
                              <Image
                                src={p.image.src}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-xl font-medium leading-tight [:lang(bn)_&]:text-lg">
                              {p.title}
                            </span>
                            {p.price ? (
                              <span className="mt-1 block text-[0.8rem] tracking-wide text-stone tabular-nums">
                                {p.price}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.pages.length ? (
                <section role="group" aria-labelledby={`${id}-pages`}>
                  <GroupHeading id={`${id}-pages`}>{copy.pages}</GroupHeading>
                  <ul role="presentation">
                    {results.pages.map((p, j) => {
                      const i = results.products.length + j;
                      return (
                        <li key={p.href} role="presentation">
                          <Link
                            href={p.href}
                            {...option(i)}
                            className={cn(
                              '-mx-3 flex items-center justify-between gap-4 border-b border-line/70 px-3 py-4 transition-colors duration-200',
                              i === current && 'bg-cream',
                            )}
                          >
                            <span className="font-display text-xl font-medium leading-tight [:lang(bn)_&]:text-lg">
                              {p.title}
                            </span>
                            <ArrowUpRight
                              aria-hidden
                              className={cn(
                                'size-4 shrink-0 text-walnut transition-transform duration-300',
                                i === current && 'translate-x-0.5 -translate-y-0.5',
                              )}
                              strokeWidth={1.2}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GroupHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className={cn(navLabel, 'mb-3 text-stone')}>
      {children}
    </p>
  );
}
