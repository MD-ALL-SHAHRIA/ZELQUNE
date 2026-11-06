'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { type Consent, parseConsent } from '@/shared/lib/consent';
import { buttonClass } from '@/shared/ui/button';
import {
  consentSnapshot,
  OPEN_SETTINGS_EVENT,
  saveConsent,
  SERVER_SNAPSHOT,
  subscribeConsent,
} from './consent-store';

export interface ConsentCopy {
  title: string;
  short: string;
  text: string;
  policy: string;
  accept: string;
  reject: string;
  customize: string;
  save: string;
  dialogTitle: string;
  dialogText: string;
  alwaysOn: string;
  close: string;
  necessary: { title: string; text: string };
  analytics: { title: string; text: string };
  marketing: { title: string; text: string };
}

import { ALL, NONE } from './consent-choices';

// The settings dialog (and Radix Dialog with it) loads only when someone opens it.
const CookieSettingsDialog = dynamic(
  () => import('./cookie-settings-dialog').then((m) => m.CookieSettingsDialog),
  { ssr: false },
);

/**
 * Cookie consent: a non-blocking banner until the visitor chooses (Accept all, Reject all and
 * Customize carry the same weight), and a settings dialog to change the choice at any time
 * (opened from the footer). Nothing optional runs before a "yes"; see shared/lib/consent.ts.
 * The banner comes first in the page's tab order so keyboard users meet it straight away.
 */
export function CookieBanner({ copy, policyHref }: { copy: ConsentCopy; policyHref: string }) {
  const raw = useSyncExternalStore(subscribeConsent, consentSnapshot, () => SERVER_SNAPSHOT);
  const stored = raw === SERVER_SNAPSHOT ? null : parseConsent(raw);
  const undecided = raw !== SERVER_SNAPSHOT && stored === null;
  const [open, setOpenState] = useState(false);
  const [used, setUsed] = useState(false);
  const setOpen = (v: boolean) => {
    if (v) setUsed(true);
    setOpenState(v);
  };
  const [draft, setDraft] = useState<Consent>(NONE);
  const titleId = useId();

  useEffect(() => {
    const show = () => {
      setDraft(parseConsent(consentSnapshot()) ?? NONE);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, []);

  const choose = (c: Consent) => {
    saveConsent(c);
    setOpen(false);
  };
  const btn = 'h-9 min-w-0 px-2 text-[0.72rem] sm:h-10 sm:text-[0.75rem]';

  return (
    <>
      {undecided && !open ? (
        <section
          role="region"
          data-cookie-banner
          aria-labelledby={titleId}
          // Compact: a small bottom-right card on desktop, a short strip on phones, so the page stays
          // the first thing people see.
          // Phones: no heading (screen readers still get it) and tighter spacing, about 110px tall.
          className="fixed inset-x-2 bottom-2 z-[60] border border-line bg-paper/95 p-3 text-ink shadow-[0_12px_40px_rgba(43,30,25,0.18)] backdrop-blur-sm sm:right-5 sm:bottom-5 sm:left-auto sm:w-[24rem] sm:p-4"
        >
          <h2 id={titleId} className="sr-only text-[0.95rem] font-medium sm:not-sr-only">
            {copy.title}
          </h2>
          <p className="text-[0.75rem] leading-snug text-stone sm:mt-1 sm:text-[0.8rem] sm:leading-relaxed">
            {copy.short}{' '}
            <Link href={policyHref} className="text-ink underline underline-offset-4">
              {copy.policy}
            </Link>
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3">
            <button
              type="button"
              onClick={() => choose(ALL)}
              className={buttonClass('primary', 'sm', btn)}
            >
              {copy.accept}
            </button>
            <button
              type="button"
              onClick={() => choose(NONE)}
              className={buttonClass('primary', 'sm', btn)}
            >
              {copy.reject}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(NONE);
                setOpen(true);
              }}
              className={buttonClass('secondary', 'sm', btn)}
            >
              {copy.customize}
            </button>
          </div>
        </section>
      ) : null}

      {used ? (
        <CookieSettingsDialog
          open={open}
          onOpenChange={setOpen}
          copy={copy}
          policyHref={policyHref}
          draft={draft}
          setDraft={setDraft}
          choose={choose}
        />
      ) : null}
    </>
  );
}

/** "Cookie settings" in the footer: reopens the dialog. */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
      className="link-reveal text-left"
    >
      {label}
    </button>
  );
}
