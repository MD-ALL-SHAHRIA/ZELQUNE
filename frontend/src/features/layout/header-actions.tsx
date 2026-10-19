'use client';

import { Menu, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/features/cart/use-cart';
import { formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { Sheet } from '@/shared/ui/sheet';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
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

export function MobileMenu({
  title,
  closeLabel,
  links,
  footer,
}: {
  title: string;
  closeLabel: string;
  links: { href: string; label: string }[];
  footer: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.menuOpen);
  const close = () => dispatch(setMenuOpen(false));
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => dispatch(setMenuOpen(v))}
      title={title}
      closeLabel={closeLabel}
      side="left"
      footer={footer}
    >
      <nav>
        <ul className="space-y-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={close}
                className="block py-2 font-display text-3xl font-light transition-opacity hover:opacity-60"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Sheet>
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
