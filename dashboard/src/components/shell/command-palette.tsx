'use client';

import { ArrowRight, CornerDownLeft, Package, Search, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './nav';

type Entry = { id: string; label: string; hint: string; icon: React.ReactNode; go: () => void };

/** ⌘K: jump to any page, open a product, or search orders. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [products, setProducts] = useState<{ id: string; nameEn: string; slug: string }[]>([]);
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setQ('');
      setActive(0);
      input.current?.focus();
      if (!products.length) {
        void api
          .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
          .then(({ data }) => {
            if (data) setProducts(data.items);
          });
      }
    }
    if (!open && el.open) el.close();
  }, [open, products.length]);

  const entries = useMemo<Entry[]>(() => {
    const term = q.trim().toLowerCase();
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const pages = NAV_ITEMS.filter(
      (n) => !term || `${n.label} ${n.keywords ?? ''}`.toLowerCase().includes(term),
    ).map((n): Entry => ({
      id: n.href,
      label: n.label,
      hint: 'Page',
      icon: <n.icon className="size-4" />,
      go: go(n.href),
    }));
    const found = products
      .filter((p) => term && `${p.nameEn} ${p.slug}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((p): Entry => ({
        id: p.id,
        label: p.nameEn,
        hint: 'Product',
        icon: <Package className="size-4" />,
        go: go(`/products/${p.id}`),
      }));
    const orders: Entry[] = term
      ? [
          {
            id: 'orders',
            label: `Search orders for “${q.trim()}”`,
            hint: 'Orders',
            icon: <ShoppingBag className="size-4" />,
            go: go(`/orders?q=${encodeURIComponent(q.trim())}`),
          },
        ]
      : [];
    return [...pages, ...found, ...orders];
  }, [q, products, onClose, router]);

  const pick = Math.min(active, Math.max(entries.length - 1, 0));
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Search"
      className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-espresso/30 backdrop:backdrop-blur-[2px] open:[animation:pop-in_.14s_ease-out]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 text-stone" aria-hidden />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, entries.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              entries[pick]?.go();
            }
          }}
          placeholder="Search pages, products, orders…"
          aria-label="Search"
          className="h-13 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-stone/70"
        />
        <kbd className="rounded border border-line px-1.5 text-[0.6875rem] text-stone">Esc</kbd>
      </div>
      <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
        {entries.map((e, i) => (
          <li key={e.id} role="option" aria-selected={i === pick}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={e.go}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                i === pick ? 'bg-ink/6 text-ink' : 'text-ink/85',
              )}
            >
              <span className="text-stone">{e.icon}</span>
              <span className="flex-1 truncate">{e.label}</span>
              <span className="text-xs text-stone">{e.hint}</span>
              {i === pick ? (
                <CornerDownLeft className="size-3.5 text-stone" aria-hidden />
              ) : (
                <ArrowRight className="size-3.5 text-transparent" aria-hidden />
              )}
            </button>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-stone">Nothing found.</li>
        ) : null}
      </ul>
    </dialog>
  );
}
