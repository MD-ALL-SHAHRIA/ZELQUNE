'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { type CartCopy } from '@/features/cart/cart-copy';
import { type Locale } from '@/i18n/config';
import { useAppSelector } from '@/store/hooks';
import type { MenuProps } from './mobile-menu';

// Drawers (Radix Dialog) load on first open, keeping them out of the initial page JavaScript.
const CartDrawer = dynamic(() => import('@/features/cart/cart-drawer').then((m) => m.CartDrawer), {
  ssr: false,
});
const MobileMenu = dynamic(() => import('./mobile-menu').then((m) => m.MobileMenu), {
  ssr: false,
});

export function Overlays({
  lang,
  cartCopy,
  menu,
}: {
  lang: Locale;
  cartCopy: CartCopy;
  menu: MenuProps;
}) {
  const cartOpen = useAppSelector((s) => s.ui.cartOpen);
  const menuOpen = useAppSelector((s) => s.ui.menuOpen);
  // Once opened, keep the drawer mounted so its close animation and state survive.
  const [cartUsed, setCartUsed] = useState(false);
  const [menuUsed, setMenuUsed] = useState(false);
  if (cartOpen && !cartUsed) setCartUsed(true);
  if (menuOpen && !menuUsed) setMenuUsed(true);
  return (
    <>
      {cartUsed ? <CartDrawer lang={lang} copy={cartCopy} /> : null}
      {menuUsed ? <MobileMenu {...menu} /> : null}
    </>
  );
}
