/**
 * The visitor's connection, for the browser only. "Slow" means data saver is on or the browser
 * reports 2G: the site then takes a lighter path (photos instead of films). Offline is
 * navigator.onLine. Both are external stores for useSyncExternalStore.
 */
type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
const connection = (): Connection | undefined =>
  (navigator as Navigator & { connection?: Connection }).connection;

export function isSlowNetwork(): boolean {
  const c = connection();
  return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g');
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function subscribeNetwork(onChange: () => void): () => void {
  const c = connection();
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  c?.addEventListener('change', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
    c?.removeEventListener('change', onChange);
  };
}
