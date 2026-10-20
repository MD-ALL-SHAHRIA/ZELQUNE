'use client';

import { Menu, ShoppingBag } from 'lucide-react';
import { useCart } from '@/features/cart/use-cart';
import { formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMenuOpen } from '@/store/slices/ui';
import { iconButton } from './header-styles';

export function MenuButton({ label }: { label: string }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.menuOpen);
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => dispatch(setMenuOpen(true))}
      className={`-ml-2.5 ${iconButton}`}
    >
      <Menu className="size-[1.3rem]" strokeWidth={1.1} />
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
      aria-haspopup="dialog"
      className={`relative -mr-2.5 ${iconButton}`}
    >
      <ShoppingBag className="size-[1.2rem]" strokeWidth={1.1} />
      {count > 0 ? (
        <span className="absolute right-0 top-0.5 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-walnut px-1 text-[0.6rem] font-medium leading-none text-paper tabular-nums">
          {formatNumber(count, lang)}
        </span>
      ) : null}
    </button>
  );
}
