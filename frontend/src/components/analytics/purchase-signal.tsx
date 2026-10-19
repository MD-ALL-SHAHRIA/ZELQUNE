'use client';

import { useEffect } from 'react';
import { pixel, toTaka } from '@/lib/analytics';
import { LAST_ORDER_KEY, type LastOrder } from '@/lib/last-order';

/** Pixel Purchase, once, for the order this browser just placed (never on a revisit). */
export function PurchaseSignal({ code }: { code: string }) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      const last = raw ? (JSON.parse(raw) as LastOrder) : null;
      if (last?.code !== code) return;
      sessionStorage.removeItem(LAST_ORDER_KEY);
      pixel('Purchase', { value: toTaka(last.totalPaisa), currency: last.currency });
    } catch {
      // Storage unavailable: skip the event.
    }
  }, [code]);
  return null;
}
