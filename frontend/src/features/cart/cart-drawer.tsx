'use client';

import { Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { href } from '@/shared/lib/site';
import { buttonClass } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Sheet } from '@/shared/ui/sheet';
import { cartErrorText, type CartCopy } from './cart-copy';
import { MAX_QTY } from './cart-rules';
import { useCart } from './use-cart';

function optionLabel(options: Record<string, unknown>, copy: CartCopy): string {
  const value = Object.values(options).find((v): v is string => typeof v === 'string') ?? '';
  return copy.variants[value] ?? value;
}

export function CartDrawer({ lang, copy }: { lang: Locale; copy: CartCopy }) {
  const { cart, open, setOpen, setQty, busy, error } = useCart();
  const items = cart?.items ?? [];
  const blocked = !items.length || cart?.mixedSaleModes || items.some((i) => !i.available);
  const max = formatNumber(MAX_QTY, lang);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={copy.cart.title}
      closeLabel={copy.ui.close}
      footer={
        items.length ? (
          <div className="space-y-4">
            <p className="flex items-baseline justify-between">
              <span className="text-[0.7rem] uppercase tracking-eyebrow text-stone">
                {copy.ui.total}
              </span>
              <span className="font-display text-3xl font-light">
                {formatTaka(cart?.subtotalPaisa ?? 0, lang)}
              </span>
            </p>
            {blocked ? (
              <span aria-disabled className={buttonClass('primary', 'lg', 'w-full opacity-40')}>
                {copy.cart.checkout}
              </span>
            ) : (
              <Link
                href={href(lang, '/checkout')}
                onClick={() => setOpen(false)}
                className={buttonClass('primary', 'lg', 'w-full')}
              >
                {copy.cart.checkout}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonClass('ghost', 'md', 'w-full justify-center text-[0.72rem]')}
            >
              {copy.cart.keepBrowsing}
            </button>
          </div>
        ) : null
      }
    >
      {!items.length ? (
        <div className="grid h-full place-items-center text-center">
          <p className="font-display text-2xl font-light text-stone">{copy.cart.empty}</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {items.map((item) => {
            const name =
              (item.productSlug && copy.names[item.productSlug]) ??
              (lang === 'bn' ? item.nameBn : item.nameEn) ??
              item.sku ??
              '';
            return (
              <li key={item.variantId} data-testid="cart-line" className="flex gap-4">
                <div className="relative h-28 w-22 shrink-0 overflow-hidden rounded-t-full bg-sand">
                  <Image
                    src={SAMPLE.productTubes.src}
                    alt=""
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-light leading-tight">{name}</p>
                      <p className="mt-1 text-xs text-stone">{optionLabel(item.options, copy)}</p>
                    </div>
                    <p className="text-sm">
                      {item.lineTotalPaisa === null ? '' : formatTaka(item.lineTotalPaisa, lang)}
                    </p>
                  </div>
                  {!item.available ? (
                    <p className="mt-2 text-xs text-danger">{copy.cart.unavailableLine}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        aria-label={`${copy.ui.quantity} −`}
                        disabled={busy}
                        onClick={() => setQty(item.variantId, item.qty - 1)}
                        className="grid size-9 place-items-center disabled:opacity-40"
                      >
                        <Minus className="size-3.5" strokeWidth={1.5} />
                      </button>
                      <span aria-live="polite" className="min-w-8 text-center text-sm">
                        {formatNumber(item.qty, lang)}
                      </span>
                      <button
                        type="button"
                        aria-label={`${copy.ui.quantity} +`}
                        disabled={busy || item.qty >= MAX_QTY}
                        onClick={() => setQty(item.variantId, item.qty + 1)}
                        className="grid size-9 place-items-center disabled:opacity-40"
                      >
                        <Plus className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setQty(item.variantId, 0)}
                      className="text-xs text-stone underline underline-offset-4 hover:text-ink"
                    >
                      {copy.ui.remove}
                    </button>
                  </div>
                  {item.qty >= MAX_QTY ? (
                    <p className="mt-2 text-xs text-stone">{fill(copy.qtyLimit, { max })}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {cart?.mixedSaleModes ? (
        <p role="alert" className="mt-6 bg-glow/40 p-4 text-sm">
          {copy.cart.mixed}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-6 text-sm text-danger">
          <CopyText>{fill(cartErrorText(error, copy), { max })}</CopyText>
        </p>
      ) : null}
    </Sheet>
  );
}
