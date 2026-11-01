'use client';

import { WifiOff, X } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { isOnline, isSlowNetwork, subscribeNetwork } from '@/shared/lib/network';

export interface NetworkCopy {
  offline: string;
  slow: string;
  dismiss: string;
}

/**
 * Offline: the page stays on screen and we say what still works. Slow (data saver or 2G): one
 * dismissible note that the site has switched to a lighter version.
 */
export function NetworkStatus({ copy }: { copy: NetworkCopy }) {
  const online = useSyncExternalStore(subscribeNetwork, isOnline, () => true);
  const slow = useSyncExternalStore(subscribeNetwork, isSlowNetwork, () => false);
  const [hideSlow, setHideSlow] = useState(false);
  const text = !online ? copy.offline : slow && !hideSlow ? copy.slow : null;
  if (!text) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-[65] mx-auto flex max-w-xl items-start gap-3 border border-line bg-paper/95 px-4 py-3 text-[0.85rem] leading-relaxed text-ink shadow-[0_12px_40px_rgba(43,30,25,0.18)] backdrop-blur-sm"
    >
      {!online ? <WifiOff className="mt-0.5 size-4 shrink-0 text-walnut" aria-hidden /> : null}
      <p className="flex-1">{text}</p>
      {online ? (
        <button
          type="button"
          aria-label={copy.dismiss}
          onClick={() => setHideSlow(true)}
          className="-my-1 -mr-1 grid size-8 shrink-0 place-items-center text-stone hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
