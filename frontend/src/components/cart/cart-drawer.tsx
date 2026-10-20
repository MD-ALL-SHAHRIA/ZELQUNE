'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { Text } from '@/components/text';
import { type Locale } from '@/i18n/config';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { MAX_QTY } from '@/lib/cart-rules';
import { href } from '@/lib/site';
import { cartErrorText, type CartCopy } from './cart-copy';
import { useCart } from './cart-context';

function optionLabel(options: Record<string, unknown>, copy: CartCopy): string {
  const value = Object.values(options).find((v): v is string => typeof v === 'string') ?? '';
  return copy.variants[value] ?? value;
}

export function CartButton({ lang, copy }: { lang: Locale; copy: CartCopy }) {
  const { cart, setOpen } = useCart();
  const count = cart?.items.reduce((n, i) => n + i.qty, 0) ?? 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="cart-button"
        className="relative rounded-md bg-walnut px-3 py-1.5 text-sm font-semibold text-cream"
      >
        {copy.cart.title}
        {count > 0 ? (
          <span className="ml-1.5 rounded-full bg-amber px-1.5 text-xs text-ink">
            {formatNumber(count, lang)}
          </span>
        ) : null}
      </button>
      <CartDrawer lang={lang} copy={copy} />
    </>
  );
}

function CartDrawer({ lang, copy }: { lang: Locale; copy: CartCopy }) {
  const { cart, open, setOpen, setQty, busy, error } = useCart();
  const items = cart?.items ?? [];
  const blocked = !items.length || cart?.mixedSaleModes || items.some((i) => !i.available);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line p-4">
            <Dialog.Title className="text-xl font-semibold text-walnut">
              {copy.cart.title}
            </Dialog.Title>
            <Dialog.Close className="rounded-md px-2 py-1 text-sm underline">
              {copy.ui.close}
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!items.length ? <p>{copy.cart.empty}</p> : null}
            {items.map((item) => {
              const name =
                (item.productSlug && copy.names[item.productSlug]) ??
                (lang === 'bn' ? item.nameBn : item.nameEn) ??
                item.sku ??
                '';
              return (
                <div
                  key={item.variantId}
                  data-testid="cart-line"
                  className="rounded-lg bg-surface p-3 ring-1 ring-line"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted">{optionLabel(item.options, copy)}</p>
                    </div>
                    <p className="font-semibold">
                      {item.lineTotalPaisa === null ? '' : formatTaka(item.lineTotalPaisa, lang)}
                    </p>
                  </div>
                  {!item.available ? (
                    <p className="mt-2 text-sm text-danger">{copy.cart.unavailableLine}</p>
                  ) : null}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="sr-only">{copy.ui.quantity}</span>
                    <button
                      type="button"
                      aria-label={`${copy.ui.quantity} −`}
                      disabled={busy}
                      onClick={() => setQty(item.variantId, item.qty - 1)}
                      className="h-9 w-9 rounded-md border border-line text-lg"
                    >
                      −
                    </button>
                    <span aria-live="polite" className="min-w-6 text-center">
                      {formatNumber(item.qty, lang)}
                    </span>
                    <button
                      type="button"
                      aria-label={`${copy.ui.quantity} +`}
                      disabled={busy || item.qty >= MAX_QTY}
                      onClick={() => setQty(item.variantId, item.qty + 1)}
                      className="h-9 w-9 rounded-md border border-line text-lg disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setQty(item.variantId, 0)}
                      className="ml-auto text-sm underline"
                    >
                      {copy.ui.remove}
                    </button>
                  </div>
                  {item.qty >= MAX_QTY ? (
                    <p className="mt-1 text-xs text-muted">
                      {fill(copy.qtyLimit, { max: formatNumber(MAX_QTY, lang) })}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {cart?.mixedSaleModes ? (
              <p role="alert" className="rounded-md bg-amber/20 p-3 text-sm">
                {copy.cart.mixed}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-danger">
                <Text>
                  {fill(cartErrorText(error, copy), { max: formatNumber(MAX_QTY, lang) })}
                </Text>
              </p>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-line p-4">
            {items.length ? (
              <p className="flex justify-between text-lg font-semibold">
                <span>{copy.ui.total}</span>
                <span>{formatTaka(cart?.subtotalPaisa ?? 0, lang)}</span>
              </p>
            ) : null}
            {blocked ? (
              <span
                aria-disabled
                className="block rounded-md bg-walnut/40 px-4 py-3 text-center font-semibold text-cream"
              >
                {copy.cart.checkout}
              </span>
            ) : (
              <Link
                href={href(lang, '/checkout')}
                onClick={() => setOpen(false)}
                className="block rounded-md bg-walnut px-4 py-3 text-center font-semibold text-cream"
              >
                {copy.cart.checkout}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="block w-full text-center text-sm underline"
            >
              {copy.cart.keepBrowsing}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
