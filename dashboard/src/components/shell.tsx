'use client';

import { ExternalLink, FileText, Gauge, LogOut, Package, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/', label: 'Overview', icon: Gauge },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/content', label: 'Home page', icon: FileText },
];

/** Sidebar + top bar for every signed-in page. */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, signOut } = useAuth();
  const user = state.status === 'signedIn' ? state.user : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-cream lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-7">
          <Link href="/" className="font-wordmark text-xl font-medium uppercase tracking-wordmark">
            Zelqune
          </Link>
          <p className="text-[0.7rem] uppercase tracking-eyebrow text-stone lg:mt-1">Admin</p>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-ink text-paper' : 'text-ink hover:bg-sand',
                )}
              >
                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
          <a
            href={site}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm text-stone hover:bg-sand"
          >
            <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
            View site
          </a>
        </nav>
        {user ? (
          <div className="hidden px-5 lg:absolute lg:bottom-6 lg:block">
            <p className="text-sm font-medium">{user.name ?? user.phone}</p>
            <p className="text-[0.72rem] text-stone">{user.role === 'OWNER' ? 'Owner' : 'Staff'}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-3 inline-flex items-center gap-2 text-[0.8rem] text-stone hover:text-ink"
            >
              <LogOut aria-hidden className="size-3.5" /> Sign out
            </button>
          </div>
        ) : null}
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
