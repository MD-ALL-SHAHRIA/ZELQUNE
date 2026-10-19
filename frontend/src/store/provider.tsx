'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { registerAnalyticsListeners } from '@/features/analytics/listeners';
import { readCookie } from '@/shared/lib/cookies';
import { COOKIE } from '@/shared/lib/visitor';
import { hydrated } from './slices/session';
import { type AppStore, makeStore } from './store';

let analyticsRegistered = false;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => {
    if (!analyticsRegistered) {
      registerAnalyticsListeners();
      analyticsRegistered = true;
    }
    return makeStore();
  });
  useEffect(() => {
    // Cookies exist only in the browser; pages stay static (ISR) and hydrate the token here.
    store.dispatch(hydrated(readCookie(COOKIE.cart) ?? null));
  }, [store]);
  return <Provider store={store}>{children}</Provider>;
}
