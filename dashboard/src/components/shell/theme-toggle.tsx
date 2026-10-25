'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const KEY = 'zq-admin-theme';
const EVENT = 'zq-admin-theme';
const subscribe = (fn: () => void) => {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
};
const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** Hook form of the theme: the same value everywhere (top bar, settings) and on every change. */
export function useAdminTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, current, () => 'light');
}

/** Sets day or night, remembers it on this device and tells every switch on the page. */
export function setAdminTheme(next: 'light' | 'dark'): void {
  const root = document.documentElement;
  if (next === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage blocked: the switch still holds for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeToggle() {
  const dark = useAdminTheme() === 'dark';
  return (
    <button
      type="button"
      onClick={() => setAdminTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid size-8 place-items-center rounded-lg text-stone transition-colors hover:bg-ink/6 hover:text-ink"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
