'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';
import { type Consent } from '@/shared/lib/consent';
import { buttonClass } from '@/shared/ui/button';
import { type ConsentCopy } from './cookie-banner';
import { ALL, NONE } from './consent-choices';

const dialogBtn = 'h-11 min-w-[7.5rem] flex-1 px-4 text-[0.85rem] sm:flex-none';

/** Cookie settings: one switch per optional category (loaded on first open). */
export function CookieSettingsDialog({
  open,
  onOpenChange,
  copy,
  policyHref,
  draft,
  setDraft,
  choose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ConsentCopy;
  policyHref: string;
  draft: Consent;
  setDraft: (c: Consent) => void;
  choose: (c: Consent) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[71] max-h-[90dvh] w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-line bg-paper p-6 text-ink shadow-[0_30px_80px_rgba(43,30,25,0.25)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-[1.6rem] leading-tight">
              {copy.dialogTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.close}
              className="-mt-1 -mr-2 grid size-10 place-items-center text-stone hover:text-ink"
            >
              <X className="size-5" strokeWidth={1.3} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-[0.92rem] leading-relaxed text-stone">
            {copy.dialogText}{' '}
            <Link href={policyHref} className="text-ink underline underline-offset-4">
              {copy.policy}
            </Link>
          </Dialog.Description>

          <ul className="mt-6 divide-y divide-line border-y border-line">
            <Category
              title={copy.necessary.title}
              text={copy.necessary.text}
              note={copy.alwaysOn}
            />
            <Category
              title={copy.analytics.title}
              text={copy.analytics.text}
              checked={draft.analytics}
              onChange={(analytics) => setDraft({ ...draft, analytics })}
            />
            <Category
              title={copy.marketing.title}
              text={copy.marketing.text}
              checked={draft.marketing}
              onChange={(marketing) => setDraft({ ...draft, marketing })}
            />
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choose(draft)}
              className={buttonClass('primary', 'md', dialogBtn)}
            >
              {copy.save}
            </button>
            <button
              type="button"
              onClick={() => choose(ALL)}
              className={buttonClass('secondary', 'md', dialogBtn)}
            >
              {copy.accept}
            </button>
            <button
              type="button"
              onClick={() => choose(NONE)}
              className={buttonClass('secondary', 'md', dialogBtn)}
            >
              {copy.reject}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** One category: a real checkbox (labelled, keyboard and screen-reader friendly). */
function Category({
  title,
  text,
  checked,
  onChange,
  note,
}: {
  title: string;
  text: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  note?: string;
}) {
  const id = useId();
  const always = !onChange;
  return (
    <li className="flex items-start justify-between gap-6 py-4">
      <div>
        <label htmlFor={id} className="text-[1rem] font-medium">
          {title}
        </label>
        <p id={`${id}-d`} className="mt-1 text-[0.86rem] leading-relaxed text-stone">
          {text}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {always ? <span className="text-[0.78rem] text-stone">{note}</span> : null}
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-describedby={`${id}-d`}
          checked={always ? true : checked}
          disabled={always}
          onChange={(e) => onChange?.(e.target.checked)}
          className="size-5 accent-[var(--color-walnut)] disabled:opacity-60"
        />
      </div>
    </li>
  );
}
