'use client';

import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
/** Dev/CI only (no site key): the gateway's fake verifier accepts any non-empty token. */
export const DEV_TURNSTILE_TOKEN = 'dev-pass';

interface TurnstileApi {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile script failed'));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * Cloudflare Turnstile. Tokens are single-use: remount (change `key`) after each submit.
 * Without a site key (dev/CI) no widget renders and the dev token is reported.
 */
export function Turnstile({ lang, onToken }: { lang: 'en' | 'bn'; onToken(token: string): void }) {
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onToken);
  useEffect(() => {
    report.current = onToken;
  });

  useEffect(() => {
    if (!SITE_KEY) {
      report.current(DEV_TURNSTILE_TOKEN);
      return;
    }
    let id: string | undefined;
    let cancelled = false;
    void loadScript().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      id = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        language: lang,
        callback: (token) => report.current(token),
        'expired-callback': () => report.current(''),
        'error-callback': () => report.current(''),
      });
    });
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [lang]);

  return SITE_KEY ? <div ref={box} className="min-h-16" /> : null;
}
