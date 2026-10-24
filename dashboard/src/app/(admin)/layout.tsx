'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shell } from '@/components/shell';
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
      <div className="grid min-h-dvh place-items-center text-sm text-stone" role="status">
        Loading…
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}
