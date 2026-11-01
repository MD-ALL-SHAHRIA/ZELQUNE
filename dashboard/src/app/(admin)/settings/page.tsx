'use client';

import {
  Bell,
  CreditCard,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page';
import { AccountSettings } from '@/features/settings/account-settings';
import { BusinessDetails } from '@/features/settings/business-details';
import { StoreDetails } from '@/features/settings/store-details';
import {
  CheckoutSettings,
  NotificationSettings,
  PaymentSettings,
  ShippingSettings,
} from '@/features/settings/store-settings';
import { TeamSettings } from '@/features/settings/team-settings';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Section =
  'store' | 'payments' | 'checkout' | 'shipping' | 'notifications' | 'team' | 'account';

const SECTIONS: {
  id: Section;
  label: string;
  hint: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}[] = [
  { id: 'store', label: 'Store details', hint: 'Contact and social links', icon: Store },
  { id: 'payments', label: 'Payments', hint: 'bKash and Nagad numbers', icon: CreditCard },
  { id: 'checkout', label: 'Checkout', hint: 'Advance for pre-orders', icon: ShoppingCart },
  { id: 'shipping', label: 'Shipping', hint: 'Delivery fees', icon: Truck },
  { id: 'notifications', label: 'Notifications', hint: 'Your SMS alerts', icon: Bell },
  { id: 'team', label: 'Team', hint: 'Who can sign in', icon: Users, ownerOnly: true },
  { id: 'account', label: 'Your account', hint: 'Profile, password, theme', icon: UserRound },
];

/** Shopify/Stripe-style settings: sections on the left, one form at a time on the right. */
export default function SettingsPage() {
  const { state } = useAuth();
  const owner = 'user' in state && state.user.role === 'OWNER';
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const visible = SECTIONS.filter((s) => owner || !s.ownerOnly);
  const asked = params.get('section') as Section | null;
  const current = visible.find((s) => s.id === asked)?.id ?? 'store';

  return (
    <>
      <PageHeader
        title="Settings"
        description="How your store works: payments, delivery, alerts and your team."
      />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {visible.map((s) => {
              const on = s.id === current;
              return (
                <li key={s.id} className="shrink-0">
                  <Link
                    href={`${pathname}?section=${s.id}`}
                    aria-current={on ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      router.replace(`${pathname}?section=${s.id}`, { scroll: false });
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      on
                        ? 'bg-surface text-ink shadow-[var(--shadow-card)] ring-1 ring-line'
                        : 'text-ink/75 hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    <s.icon
                      className={cn('size-4 shrink-0', on ? 'text-ink' : 'text-stone')}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block font-medium whitespace-nowrap">{s.label}</span>
                      <span className="hidden text-xs text-stone lg:block">{s.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 max-w-3xl">
          {current === 'store' ? (
            <div className="space-y-6">
              <StoreDetails readOnly={!owner} />
              <BusinessDetails readOnly={!owner} />
            </div>
          ) : null}
          {current === 'payments' ? <PaymentSettings readOnly={!owner} /> : null}
          {current === 'checkout' ? <CheckoutSettings readOnly={!owner} /> : null}
          {current === 'shipping' ? <ShippingSettings readOnly={!owner} /> : null}
          {current === 'notifications' ? <NotificationSettings readOnly={!owner} /> : null}
          {current === 'team' && owner ? <TeamSettings /> : null}
          {current === 'account' ? <AccountSettings /> : null}
        </div>
      </div>
    </>
  );
}
