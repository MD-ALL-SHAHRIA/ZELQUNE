'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';
import { iconButton } from './header-styles';
import { THEME_KEY, type Theme } from './theme';

/** The theme on screen: the saved choice (set on <html> by the head script) or the system's. */
function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const CHANGE = 'zq-theme-change';

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/**
 * Light (Gallery Ivory) / dark (Dark Walnut) switch. The choice is saved and wins over the
 * system setting from then on; until the visitor chooses, the site follows the system.
 */
export function ThemeToggle({
  labels,
  className = '',
}: {
  labels: { themeDark: string; themeLight: string };
  className?: string;
}) {
  // Unknown on the server (the theme lives in the browser), so the first render shows the moon.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  const toggle = () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this page view.
    }
    window.dispatchEvent(new Event(CHANGE));
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={dark ? labels.themeLight : labels.themeDark}
      className={cn(iconButton, className)}
    >
      {dark ? (
        <Sun className="size-[1.15rem]" strokeWidth={1.1} />
      ) : (
        <Moon className="size-[1.1rem]" strokeWidth={1.1} />
      )}
    </button>
  );
}
