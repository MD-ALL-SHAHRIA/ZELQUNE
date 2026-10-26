'use client';

import { ExternalLink, Menu, PanelLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { CommandPalette } from './command-palette';
import { HeaderSlot } from './header-slot';
import { LogoMark } from './logo';
import { NAV_GROUPS } from './nav';
import { HeaderTools, type Inbox } from './top-bar';

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

/**
 * Sidebar on the canvas (Northstar pattern): brand tile, a "Search or jump to" pill, roomy nav
 * items with a grey pill for the current page, monospace section labels and outlined counts.
 */
function Sidebar({
  onNavigate,
  onSearch,
  pending,
}: {
  onNavigate?: () => void;
  onSearch: () => void;
  pending: Inbox | null;
}) {
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
  const item =
    'group flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] transition-colors';

  return (
    <div className="flex h-full flex-col px-4 pt-5 pb-4">
      <div className="flex items-center gap-3 px-1">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Zelqune admin home"
          className="flex min-w-0 items-center gap-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-[linear-gradient(160deg,#5a3e2b,#2f201a)] text-[#e9c48f] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_6px_rgba(47,32,26,0.35)]">
            <LogoMark className="h-[1.15rem]" />
          </span>
          <span className="truncate font-wordmark text-[1.15rem] font-medium tracking-[0.28em] text-ink uppercase">
            Zelqune
          </span>
        </Link>
        <span
          aria-hidden
          className="ml-auto hidden size-7 place-items-center rounded-lg text-stone lg:grid"
        >
          <PanelLeft className="size-4" strokeWidth={1.6} />
        </span>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="mt-5 flex h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-[0.9375rem] text-stone shadow-[0_1px_1px_rgba(36,28,24,0.03)] transition-colors hover:border-ink/20"
      >
        <Search className="size-[1.1rem]" aria-hidden />
        <span className="flex-1 text-left">Search or jump to</span>
        <kbd className="font-mono text-[0.75rem] text-stone/80">⌘K</kbd>
      </button>

      <nav aria-label="Main" className="mt-4 -mr-2 flex-1 space-y-6 overflow-y-auto pr-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <p className="mb-1.5 px-3 font-mono text-[0.75rem] tracking-[0.14em] text-stone/80 uppercase">
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
                        item,
                        on
                          ? 'bg-ink/[0.065] font-medium text-ink'
                          : 'text-ink/75 hover:bg-ink/[0.04] hover:text-ink',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-[1.15rem] shrink-0',
                          on ? 'text-ink' : 'text-ink/55 group-hover:text-ink',
                        )}
                        strokeWidth={on ? 2.1 : 1.7}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge ? (
                        <span
                          title={
                            href === '/orders'
                              ? 'Orders waiting for a payment check'
                              : 'New requests to answer'
                          }
                          className="grid h-6 min-w-8 place-items-center rounded-full border border-line bg-surface px-2 font-mono text-[0.75rem] text-ink/75 tabular"
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
          className={cn(item, 'text-ink/75 hover:bg-ink/[0.04] hover:text-ink')}
        >
          <ExternalLink aria-hidden className="size-[1.15rem] text-ink/55" strokeWidth={1.7} />
          <span className="flex-1">View store</span>
          <span className="rounded-full bg-[#d6336c]/[0.08] px-2 py-0.5 font-mono text-[0.6875rem] tracking-[0.06em] text-[#b8285c] uppercase dark:text-[#f08cb0]">
            Live
          </span>
        </a>
      </nav>
    </div>
  );
}

/**
 * Northstar-style frame: the sidebar and the page title sit on a soft canvas; each page's
 * content lives in one large white panel. ⌘K opens search from anywhere.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
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
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar pending={pending} onSearch={() => setPalette(true)} />
      </aside>
      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-espresso/40"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-canvas shadow-[var(--shadow-pop)] [animation:pop-in_.16s_ease-out]">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
              className="absolute top-5 right-3 z-10 grid size-8 place-items-center rounded-lg hover:bg-ink/6"
            >
              <X className="size-4" />
            </button>
            <Sidebar
              pending={pending}
              onNavigate={() => setDrawer(false)}
              onSearch={() => {
                setDrawer(false);
                setPalette(true);
              }}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        {/* Tools on their own row; the page title and its buttons sit underneath. */}
        <div className="flex h-14 items-center gap-3 px-4 pt-2 sm:px-6 lg:pr-6 lg:pl-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
            className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-ink/6 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto">
            <HeaderTools inbox={pending} onSearch={() => setPalette(true)} />
          </div>
        </div>
        <div ref={setSlot} className="min-w-0 px-4 pb-4 sm:px-6 lg:pr-6 lg:pb-5 lg:pl-3" />
        <main className="px-2 pb-2 sm:px-3 sm:pb-3 lg:pr-4 lg:pb-4 lg:pl-0">
          <div className="min-h-[calc(100dvh-7.5rem)] rounded-[1.75rem] border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(36,28,24,0.04)] sm:p-5 lg:p-6">
            <HeaderSlot.Provider value={slot}>{children}</HeaderSlot.Provider>
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
