'use client';

import { Check, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/features/cart/use-cart';
import { type Locale } from '@/i18n/config';
import { formatTaka } from '@/i18n/format';
import { href } from '@/shared/lib/site';

export interface PairItem {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: { src: string; alt: string } | null;
  unitPricePaisa: number;
  /** The regular price while a sale runs (shown struck through). */
  regularPaisa: number | null;
}

/**
 * "Complete the wall" (Apex's "Complete your look"): a few pieces that sit well beside this one,
 * right under the buying decision, each added to the cart in one tap without leaving the page.
 */
export function CompleteTheWall({
  items,
  lang,
  copy,
}: {
  items: PairItem[];
  lang: Locale;
  copy: { heading: string; note: string; add: string; added: string };
}) {
  const { add } = useCart();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <section aria-labelledby="complete-the-wall" className="space-y-4">
      <div>
        <h2
          id="complete-the-wall"
          className="font-display text-2xl font-medium leading-tight [:lang(bn)_&]:text-xl"
        >
          {copy.heading}
        </h2>
        <p className="mt-1 text-sm text-stone">{copy.note}</p>
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li
            key={it.variantId}
            className="flex items-center gap-4 border border-line bg-surface/70 p-2.5 pr-3"
          >
            <Link
              href={href(lang, `/products/${it.slug}`)}
              className="relative size-[4.5rem] shrink-0 overflow-hidden bg-sand"
            >
              {it.image ? (
                <Image
                  src={it.image.src}
                  alt={it.image.alt}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={href(lang, `/products/${it.slug}`)}
                className="line-clamp-2 text-[0.95rem] leading-snug underline-offset-4 hover:underline"
              >
                {it.name}
              </Link>
              <p className="mt-1 text-sm tabular-nums">
                <span className={it.regularPaisa ? 'text-sale' : 'text-ink/85'}>
                  {formatTaka(it.unitPricePaisa, lang)}
                </span>
                {it.regularPaisa ? (
                  <del className="ml-2 text-xs text-stone">{formatTaka(it.regularPaisa, lang)}</del>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === it.variantId || done[it.variantId]}
              onClick={async () => {
                setBusy(it.variantId);
                const ok = await add({
                  productId: it.productId,
                  variantId: it.variantId,
                  qty: 1,
                  unitPricePaisa: it.unitPricePaisa,
                  openDrawer: false,
                });
                setBusy(null);
                if (ok) setDone((d) => ({ ...d, [it.variantId]: true }));
              }}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 border border-line bg-paper px-3.5 text-[0.78rem] font-medium uppercase tracking-[0.12em] transition-colors duration-300 hover:border-ink disabled:opacity-60 [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
            >
              {done[it.variantId] ? (
                <Check aria-hidden strokeWidth={1.6} className="size-4" />
              ) : (
                <Plus aria-hidden strokeWidth={1.6} className="size-4" />
              )}
              {done[it.variantId] ? copy.added : copy.add}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
