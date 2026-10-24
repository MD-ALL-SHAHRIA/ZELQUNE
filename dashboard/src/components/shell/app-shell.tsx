'use client';

import { ExternalLink, LogOut, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { CommandPalette } from './command-palette';
import { NAV_GROUPS } from './nav';
import { ThemeToggle } from './theme-toggle';

/** Orders waiting for a payment check and new quote requests, refreshed every minute. */
function usePendingCount() {
  const [count, setCount] = useState<{ orders: number; quotes: number } | null>(null);
  useEffect(() => {
    const load = () =>
      void Promise.all([
        api.GET('/v1/admin/orders', { params: { query: { status: 'PENDING_PAYMENT', limit: 1 } } }),
        api.GET('/v1/admin/quotes', { params: { query: { status: 'NEW', limit: 1 } } }),
      ]).then(([o, q]) => setCount({ orders: o.data?.total ?? 0, quotes: q.data?.total ?? 0 }));
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, []);
  return count;
}

function Sidebar({ onNavigate, onSearch }: { onNavigate?: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const { state, signOut } = useAuth();
  const user = state.status === 'signedIn' ? state.user : null;
  const pending = usePendingCount();
  const owner = user?.role === 'OWNER';
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => owner || !i.ownerOnly),
  })).filter((g) => g.items.length);
  // The longest matching link is the current page (/finance vs /finance/expenses).
  const current = groups
    .flatMap((g) => g.items)
    .filter(({ href }) => (href === '/' ? pathname === '/' : pathname.startsWith(href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="grid size-7 place-items-center rounded-lg bg-ink font-wordmark text-[0.9rem] font-semibold text-paper">
          Z
        </span>
        <span className="font-wordmark text-[1.05rem] font-semibold tracking-[0.22em] uppercase">
          Zelqune
        </span>
        <span className="ml-auto rounded-md bg-ink/6 px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-stone uppercase">
          Admin
        </span>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-[0.8125rem] text-stone shadow-[var(--shadow-card)] hover:border-ink/25"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-line px-1 font-sans text-[0.6875rem]">⌘K</kbd>
        </button>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <p className="mb-1 px-2.5 text-[0.6875rem] font-medium tracking-wide text-stone/80 uppercase">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const on = href === current;
                const badge =
                  href === '/orders' ? pending?.orders : href === '/quotes' ? pending?.quotes : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] font-medium transition-colors',
                        on
                          ? 'bg-surface text-ink shadow-[var(--shadow-card)] ring-1 ring-line'
                          : 'text-ink/75 hover:bg-ink/5 hover:text-ink',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-4',
                          on ? 'text-ink' : 'text-stone group-hover:text-ink',
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1">{label}</span>
                      {badge ? (
                        <span
                          title={
                            href === '/orders'
                              ? 'Orders waiting for a payment check'
                              : 'New requests to answer'
                          }
                          className="rounded-full bg-warning/15 px-1.5 text-[0.6875rem] font-semibold text-warning tabular"
                        >
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <a
          href={site}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[0.8125rem] font-medium text-ink/75 hover:bg-ink/5 hover:text-ink"
        >
          <ExternalLink aria-hidden className="size-4 text-stone" strokeWidth={1.75} />
          View store
        </a>
      </nav>
      {user ? (
        <div className="flex items-center gap-2.5 border-t border-line p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-walnut/15 text-xs font-semibold text-walnut">
            {(user.name ?? user.phone).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium">{user.name ?? user.phone}</p>
            <p className="text-[0.6875rem] text-stone">
              {user.role === 'OWNER' ? 'Owner' : 'Staff'}
            </p>
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-8 place-items-center rounded-lg text-stone hover:bg-ink/6 hover:text-ink"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Polaris/Linear-style frame: fixed sidebar, ⌘K search, content on a calm canvas. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-cream lg:block">
        <Sidebar onSearch={() => setPalette(true)} />
      </aside>
      <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-cream/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setDrawer(true)}
          className="grid size-9 place-items-center rounded-lg hover:bg-ink/6"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-wordmark text-base font-semibold tracking-[0.22em] uppercase">
          Zelqune
        </span>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setPalette(true)}
          className="ml-auto grid size-9 place-items-center rounded-lg hover:bg-ink/6"
        >
          <Search className="size-4" />
        </button>
      </div>
      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-espresso/40"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-cream shadow-[var(--shadow-pop)] [animation:pop-in_.16s_ease-out]">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg hover:bg-ink/6"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} onSearch={() => setPalette(true)} />
          </aside>
        </div>
      ) : null}
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
