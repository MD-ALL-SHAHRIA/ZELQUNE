'use client';

import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const subscribe = (fn: () => void) => {
  window.addEventListener('online', fn);
  window.addEventListener('offline', fn);
  return () => {
    window.removeEventListener('online', fn);
    window.removeEventListener('offline', fn);
  };
};

/** Offline: everything on screen stays; say what still works and what waits for the connection. */
export function NetworkBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/[0.12] px-4 py-2 text-center text-[0.8125rem] text-ink"
    >
      <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
      You&apos;re offline. You can keep reading and editing this page; saving and loading new data
      will work again when you&apos;re back online.
    </p>
  );
}
