'use client';

import { ExternalLink, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { CommandPalette } from './command-palette';
import { NAV_GROUPS } from './nav';
import { Logo } from './logo';
import { type Inbox, TopBar } from './top-bar';

/** Orders waiting for a payment check and new quote requests, refreshed every minute. */
function usePendingCount() {
  const [count, setCount] = useState<Inbox | null>(null);
  useEffect(() => {
    const load = () =>
      void Promise.all([
        api.GET('/v1/admin/orders', { params: { query: { status: 'PENDING_PAYMENT', limit: 1 } } }),
        api.GET('/v1/admin/quotes', { params: { query: { status: 'NEW', limit: 1 } } }),
      ]).then(([o, q]) => setCount({ payments: o.data?.total ?? 0, quotes: q.data?.total ?? 0 }));
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, []);
  return count;
}

function Sidebar({ onNavigate, pending }: { onNavigate?: () => void; pending: Inbox | null }) {
  const pathname = usePathname();
  const { state } = useAuth();
  const user = state.status === 'signedIn' ? state.user : null;
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
        <Link href="/" onClick={onNavigate} aria-label="Zelqune admin home">
          <Logo />
        </Link>
        <span className="ml-auto rounded-md bg-ink/6 px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-stone uppercase">
          Admin
        </span>
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
                  href === '/orders' ? pending?.payments : href === '/quotes' ? pending?.quotes : 0;
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
    </div>
  );
}

/** Polaris/Linear-style frame: fixed sidebar, ⌘K search, content on a calm canvas. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pending = usePendingCount();
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
        <Sidebar pending={pending} />
      </aside>
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
            <Sidebar pending={pending} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      ) : null}
      <main className="lg:pl-60">
        <TopBar
          inbox={pending}
          onSearch={() => setPalette(true)}
          menuButton={
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
              className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-ink/6 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          }
        />
        <div className="mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
