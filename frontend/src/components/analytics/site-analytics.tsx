'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ADD_TO_CART_EVENT, type AddToCartDetail } from '@/components/cart/cart-context';
import { INITIATE_CHECKOUT_EVENT } from '@/components/checkout/checkout-form';
import { pixel, sendEvent, toTaka } from '@/lib/analytics';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Site-wide listeners: add-to-cart beacon, Pixel page views and checkout start. */
export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    pixel('PageView');
  }, [pathname]);

  useEffect(() => {
    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<AddToCartDetail>).detail;
      sendEvent('ADD_TO_CART', { productId: d.productId, variantId: d.variantId });
      pixel('AddToCart', {
        content_ids: [d.variantId],
        content_type: 'product',
        value: toTaka(d.unitPricePaisa * d.qty),
        currency: 'BDT',
      });
    };
    const onCheckout = (e: Event) => {
      const d = (e as CustomEvent<{ valuePaisa: number }>).detail;
      pixel('InitiateCheckout', { value: toTaka(d.valuePaisa), currency: 'BDT' });
    };
    window.addEventListener(ADD_TO_CART_EVENT, onAdd);
    window.addEventListener(INITIATE_CHECKOUT_EVENT, onCheckout);
    return () => {
      window.removeEventListener(ADD_TO_CART_EVENT, onAdd);
      window.removeEventListener(INITIATE_CHECKOUT_EVENT, onCheckout);
    };
  }, []);

  if (!PIXEL_ID) return null;
  // Standard Meta Pixel bootstrap; loads only when the env flag is set.
  return (
    <Script id="meta-pixel" strategy="lazyOnload">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});fbq('track','PageView');`}
    </Script>
  );
}
