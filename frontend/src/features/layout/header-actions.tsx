'use client';

import { Menu, ShoppingBag } from 'lucide-react';
import { useCart } from '@/features/cart/use-cart';
import { formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { useAppDispatch } from '@/store/hooks';
import { setMenuOpen } from '@/store/slices/ui';

export function MenuButton({ label }: { label: string }) {
  const dispatch = useAppDispatch();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => dispatch(setMenuOpen(true))}
      className="-ml-2 grid size-10 place-items-center lg:hidden"
    >
      <Menu className="size-5" strokeWidth={1.25} />
    </button>
  );
}

export function CartButton({ lang, label }: { lang: Locale; label: string }) {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      data-testid="cart-button"
      aria-label={label}
      className="relative -mr-2 grid size-10 place-items-center"
    >
      <ShoppingBag className="size-5" strokeWidth={1.25} />
      {count > 0 ? (
        <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-ink px-1 text-[0.6rem] leading-4 text-paper">
          {formatNumber(count, lang)}
        </span>
      ) : null}
    </button>
  );
}
