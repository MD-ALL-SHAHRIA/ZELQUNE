'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useHeaderSlot } from '@/components/shell/header-slot';

/**
 * Page title row (Northstar pattern): a large quiet title on the canvas with the page's actions
 * on the right. Inside the admin shell it renders into the shell's header row; elsewhere inline.
 */
export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  meta?: React.ReactNode;
}) {
  const slot = useHeaderSlot();
  const row = (
    <header className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {crumbs?.length ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-1 flex items-center gap-1 text-[0.8125rem] text-stone"
          >
            {crumbs.map((c) => (
              <span key={c.href} className="flex items-center gap-1">
                <Link href={c.href} className="hover:text-ink">
                  {c.label}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[1.75rem] leading-tight font-normal tracking-[-0.025em] text-ink/85 sm:text-[2rem]">
            {title}
          </h1>
          {meta}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm text-stone">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
  return slot ? createPortal(row, slot) : <div className="mb-6">{row}</div>;
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-xl bg-ink/6 text-stone [&_svg]:size-5">
        {icon}
      </div>
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-stone">{children}</div> : null}
    </div>
  );
}

/** Shopify-style bar that appears while a form has unsaved changes. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  message = 'Unsaved changes',
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  message?: string;
}) {
  if (!dirty) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 [animation:pop-in_.16s_ease-out] lg:left-(--sb)">
      <div className="flex w-full max-w-3xl items-center justify-between gap-4 rounded-xl bg-espresso px-4 py-2.5 text-ivory shadow-[var(--shadow-pop)]">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="h-8 rounded-lg px-3 text-sm text-ivory/80 hover:bg-ivory/10 hover:text-ivory disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-8 rounded-lg bg-ivory px-3.5 text-sm font-medium text-espresso hover:bg-ivory/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
