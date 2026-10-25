'use client';

import {
  Bell,
  CreditCard,
  ExternalLink,
  FileSignature,
  LogOut,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './theme-toggle';

export interface Inbox {
  /** Orders waiting for an advance check. */
  payments: number;
  /** New B2B, design and construction requests. */
  quotes: number;
}

/** Closes a popover on a click outside `ref` and on Escape. */
function useDismiss(ref: React.RefObject<HTMLDivElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

const panel =
  'absolute top-11 right-0 z-40 rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)] [animation:pop-in_.14s_ease-out]';

/**
 * The bar above every page (Google Workspace / Shopify pattern): search on the left, then the
 * to-do bell, the theme switch and the profile menu.
 */
export function TopBar({
  inbox,
  onSearch,
  menuButton,
}: {
  inbox: Inbox | null;
  onSearch: () => void;
  menuButton?: React.ReactNode;
}) {
  const { state, signOut } = useAuth();
  const user = state.status === 'signedIn' ? state.user : null;
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeBell = useCallback(() => setBellOpen(false), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  useDismiss(bellRef, bellOpen, closeBell);
  useDismiss(profileRef, profileOpen, closeProfile);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
  const total = (inbox?.payments ?? 0) + (inbox?.quotes ?? 0);
  const initials = (user?.name ?? 'Z')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md lg:px-8">
      {menuButton}
      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 w-full min-w-0 max-w-md items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-[0.8125rem] text-stone shadow-[var(--shadow-card)] hover:border-ink/25"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">Search orders, products, pages…</span>
        <kbd className="hidden rounded border border-line px-1.5 font-sans text-[0.6875rem] sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            aria-label={total ? `${total} things need you` : 'Nothing needs you'}
            aria-expanded={bellOpen}
            onClick={() => setBellOpen((o) => !o)}
            className="relative grid size-9 place-items-center rounded-lg text-ink/75 hover:bg-ink/6 hover:text-ink"
          >
            <Bell className="size-[1.1rem]" />
            {total ? (
              <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold text-white tabular">
                {total > 99 ? '99+' : total}
              </span>
            ) : null}
          </button>
          {bellOpen ? (
            <div className={cn(panel, 'w-80')}>
              <p className="border-b border-line px-4 py-3 text-sm font-semibold">Needs you</p>
              {total ? (
                <ul className="p-1.5">
                  {inbox?.payments ? (
                    <InboxRow
                      href="/orders?status=PENDING_PAYMENT"
                      icon={<CreditCard className="size-4" />}
                      title={`${inbox.payments} payment${inbox.payments === 1 ? '' : 's'} to check`}
                      text="Match the bKash/Nagad Transaction ID, then verify."
                      onClick={closeBell}
                    />
                  ) : null}
                  {inbox?.quotes ? (
                    <InboxRow
                      href="/quotes"
                      icon={<FileSignature className="size-4" />}
                      title={`${inbox.quotes} new request${inbox.quotes === 1 ? '' : 's'}`}
                      text="Bulk orders to price, design and construction leads to call."
                      onClick={closeBell}
                    />
                  ) : null}
                </ul>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  You&apos;re all caught up.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <ThemeToggle />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-label="Your account"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((o) => !o)}
            className="ml-1 grid size-8 place-items-center rounded-full bg-walnut text-xs font-semibold text-paper ring-2 ring-paper hover:opacity-90"
          >
            {initials}
          </button>
          {profileOpen ? (
            <div className={cn(panel, 'w-64 p-1.5')}>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium text-ink">{user?.name ?? 'Admin'}</p>
                <p className="truncate text-xs text-stone">
                  {user?.role === 'OWNER' ? 'Owner' : 'Staff'} ·{' '}
                  {user?.phone.replace(/^\+880/, '0')}
                </p>
              </div>
              <div className="my-1 h-px bg-line" />
              <MenuLink href="/settings?section=account" onClick={closeProfile}>
                <UserRound className="size-4" /> Your account
              </MenuLink>
              <MenuLink href="/settings" onClick={closeProfile}>
                <Settings className="size-4" /> Settings
              </MenuLink>
              <a
                href={site}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-ink/5"
              >
                <ExternalLink className="size-4" /> View store
              </a>
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/8"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InboxRow({
  href,
  icon,
  title,
  text,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="flex gap-3 rounded-lg px-3 py-2.5 hover:bg-ink/5"
      >
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-warning/12 text-warning">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-medium text-ink">{title}</span>
          <span className="block text-xs text-stone">{text}</span>
        </span>
      </Link>
    </li>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-ink/5"
    >
      {children}
    </Link>
  );
}
