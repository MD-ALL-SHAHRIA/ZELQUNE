'use client';

import { LockKeyhole } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { useCustomer } from './use-customer';

export interface AccountPrefill {
  name: string;
  /** Local format (01XXXXXXXXX) for the form field. */
  phone: string;
  email: string;
}

/**
 * Orders and requests need a signed-in customer (ADR 0021). Loading shows the form's shape;
 * signed out explains why and offers sign in or sign up, coming back here afterwards; signed in
 * renders the form with the account's details.
 */
export function AccountGate({
  lang,
  copy,
  kind,
  children,
}: {
  lang: Locale;
  copy: Dictionary['checkout']['accountGate'];
  kind: 'order' | 'request';
  children: (account: AccountPrefill) => React.ReactNode;
}) {
  const state = useCustomer();
  const next = usePathname() + (kind === 'request' ? '#form' : '');
  if (state.status === 'loading')
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    );
  if (state.status === 'signedOut') {
    const q = `?next=${encodeURIComponent(next)}`;
    return (
      <div className="space-y-6 border border-line bg-cream/60 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-paper text-walnut">
          <LockKeyhole className="size-5" strokeWidth={1.4} aria-hidden />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-[1.8rem] leading-tight">{copy.title}</h2>
          <p className="max-w-md leading-relaxed text-stone">
            {kind === 'order' ? copy.order : copy.request}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`${href(lang, '/account/login')}${q}`}>{copy.signIn}</ButtonLink>
          <ButtonLink href={`${href(lang, '/account/register')}${q}`} variant="outline">
            {copy.create}
          </ButtonLink>
        </div>
      </div>
    );
  }
  const c = state.customer;
  return (
    <>
      {children({ name: c.name ?? '', phone: c.phone.replace(/^\+88/, ''), email: c.email ?? '' })}
    </>
  );
}
