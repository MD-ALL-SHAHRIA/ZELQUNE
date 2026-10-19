'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';
import { env } from '@/config/env';
import { useAppDispatch } from '@/store/hooks';
import { pageViewed } from './events';

/** Page views on client navigation, and the Meta Pixel bootstrap (only with the env flag). */
export function SiteAnalytics() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(pageViewed({ path: pathname }));
  }, [pathname, dispatch]);

  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;
  return (
    <Script id="meta-pixel" strategy="lazyOnload">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});`}
    </Script>
  );
}
