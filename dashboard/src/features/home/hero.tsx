import { ExternalLink, Package, Ticket, Zap } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/shell/logo';
import { formatTaka } from '@/lib/format';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

const today = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Dhaka',
});

/**
 * The welcome band at the top of Home (BankDash / Envato pattern): who and when, today's
 * numbers, the GO target as a brass progress bar, and the four things the owner does most.
 * Espresso in both themes, like the storefront's coffee bands.
 */
export function HomeHero({
  greeting,
  todayRevenue,
  todayOrders,
  toDo,
  go,
}: {
  greeting: string;
  todayRevenue: number | null;
  todayOrders: number | null;
  toDo: number | null;
  go: { count: number; target: number } | null;
}) {
  const pct = go ? Math.min(100, Math.round((go.count / go.target) * 100)) : 0;
  const stat = (label: string, value: string | null) => (
    <div>
      <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-ivory/55 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ivory tabular">
        {value ?? '—'}
      </p>
    </div>
  );
  const action = (href: string, icon: React.ReactNode, label: string, external = false) =>
    external ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-ivory/15 px-3.5 text-[0.8125rem] font-medium text-ivory/90 transition-colors hover:border-ivory/35 hover:bg-ivory/8 [&_svg]:size-4"
      >
        {icon}
        {label}
      </a>
    ) : (
      <Link
        href={href}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-ivory/15 px-3.5 text-[0.8125rem] font-medium text-ivory/90 transition-colors hover:border-ivory/35 hover:bg-ivory/8 [&_svg]:size-4"
      >
        {icon}
        {label}
      </Link>
    );

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#2f201a_0%,#3b2922_45%,#5a3e2b_100%)] px-6 py-7 text-ivory shadow-[var(--shadow-pop)] sm:px-8 dark:bg-[linear-gradient(120deg,#120e0c_0%,#1d1612_50%,#2f2219_100%)] dark:ring-1 dark:ring-ivory/8">
      {/* The lamp glow and the arch mark: the brand's light, quietly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(233,184,114,0.38),transparent_65%)] blur-2xl"
      />
      <LogoMark className="pointer-events-none absolute -right-6 -bottom-10 h-56 text-ivory/[0.06]" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-[#e9c48f]">{today.format(new Date())}</p>
          <h1 className="mt-1 font-wordmark text-[2.1rem] leading-tight font-medium sm:text-[2.4rem]">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-ivory/70">Here is how Zelqune is doing today.</p>
        </div>
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          {stat('Revenue today', todayRevenue === null ? null : formatTaka(todayRevenue))}
          {stat('Orders today', todayOrders === null ? null : String(todayOrders))}
          {stat('Needs you', toDo === null ? null : String(toDo))}
        </div>
      </div>

      <div className="relative mt-7 flex flex-wrap items-end justify-between gap-5">
        <div className="w-full max-w-sm">
          <div className="flex items-baseline justify-between text-[0.8125rem]">
            <span className="text-ivory/75">GO target · paid pre-orders</span>
            <span className="font-semibold text-ivory tabular">
              {go ? `${go.count} of ${go.target}` : '—'}
            </span>
          </div>
          <div
            className="mt-2 h-2 rounded-full bg-ivory/12"
            role="progressbar"
            aria-label="GO target"
            aria-valuemin={0}
            aria-valuemax={go?.target ?? 10}
            aria-valuenow={go?.count ?? 0}
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#c9a46a,#e9b872)] transition-[width] duration-700"
              style={{ width: `${Math.max(pct, go && go.count > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {action('/products', <Package />, 'Products')}
          {action('/marketing/sales', <Zap />, 'Flash sale')}
          {action('/marketing/coupons', <Ticket />, 'Coupon')}
          {action(site, <ExternalLink />, 'View store', true)}
        </div>
      </div>
    </section>
  );
}
