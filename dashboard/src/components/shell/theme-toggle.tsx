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

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => 'light');
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => {
        const next = dark ? 'light' : 'dark';
        if (next === 'dark') document.documentElement.dataset.theme = 'dark';
        else delete document.documentElement.dataset.theme;
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // Storage blocked: the switch still holds for this visit.
        }
        window.dispatchEvent(new Event(EVENT));
      }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid size-8 place-items-center rounded-lg text-stone transition-colors hover:bg-ink/6 hover:text-ink"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
