'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import {
  consentSnapshot,
  SERVER_SNAPSHOT,
  subscribeConsent,
} from '@/features/consent/consent-store';
import { parseConsent } from '@/shared/lib/consent';
import { useAppDispatch } from '@/store/hooks';
import { pageViewed } from './events';

/**
 * Page views on client navigation, and the Meta Pixel bootstrap: only with the env flag AND the
 * visitor's marketing consent (never before a "yes"; a later "no" reloads the page without it).
 */
export function SiteAnalytics() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(pageViewed({ path: pathname }));
  }, [pathname, dispatch]);

  const raw = useSyncExternalStore(subscribeConsent, consentSnapshot, () => SERVER_SNAPSHOT);
  const marketing = raw !== SERVER_SNAPSHOT && parseConsent(raw)?.marketing === true;
  const pixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || !marketing) return null;
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
