'use client';

import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { iconButton } from './header-styles';
import { type SearchIndex } from './search';

export interface SearchCopy {
  search: string;
  close: string;
  placeholder: string;
  products: string;
  pages: string;
  empty: string;
}

// The overlay (Radix Dialog + results) loads on first open, so it adds no JS until used.
const SearchDialog = dynamic(() => import('./search-dialog').then((m) => m.SearchDialog), {
  ssr: false,
});

function typingInField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export function SearchButton({ index, copy }: { index: SearchIndex; copy: SearchCopy }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);

  // "/" or Ctrl/Cmd+K opens search from anywhere (except while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (combo || (e.key === '/' && !typingInField(e.target))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label={copy.search}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          iconButton,
          'group xl:flex xl:w-auto xl:items-center xl:gap-3 xl:px-1 xl:hover:opacity-100',
        )}
      >
        <Search className="size-[1.15rem]" strokeWidth={1.2} />
        <span
          aria-hidden
          className="hidden w-44 border-b border-line pb-1 text-left text-[0.8rem] text-stone transition-colors duration-300 group-hover:border-ink group-hover:text-ink xl:block"
        >
          {copy.search}
        </span>
      </button>
      {used ? <SearchDialog open={open} onOpenChange={setOpen} index={index} copy={copy} /> : null}
    </>
  );
}
