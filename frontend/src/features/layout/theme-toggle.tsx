'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/shared/lib/cn';
import { iconButton } from './header-styles';
import { THEME_KEY, type Theme } from './theme';

/** The theme on screen: night only when chosen (set on <html> by the head script), else day. */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

const CHANGE = 'zq-theme-change';

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

/**
 * Day (soft cream, the default) / night (Dark Walnut) switch. The choice is saved for later
 * visits.
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
    if (next === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
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
