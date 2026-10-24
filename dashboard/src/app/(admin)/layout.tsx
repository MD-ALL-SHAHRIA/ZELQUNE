'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

/** Every admin page needs an OWNER/STAFF session; otherwise back to sign-in. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'signedOut') router.replace('/login');
  }, [state.status, router]);
  if (state.status !== 'signedIn') {
    return (
      <div className="flex min-h-dvh" role="status" aria-label="Loading">
        <div className="hidden w-60 border-r border-line bg-cream lg:block" />
        <div className="flex-1 space-y-4 p-10">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
