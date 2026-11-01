'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  errorMessage,
  onSessionEnded,
  refreshSession,
  type Schemas,
  setAccessToken,
} from './api';

type User = Schemas['AuthUserDto_Output'];
/**
 * `expired`: the session ended while someone was working. The page stays mounted (unsaved edits
 * stay in memory) and a dialog asks them to sign in again; nothing is thrown away.
 */
type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }
  | { status: 'expired'; user: User };

interface Auth {
  state: State;
  signIn: (phone: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

/** Restores the session from the refresh cookie on load; OWNER/STAFF only. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const loadMe = useCallback(async () => {
    const { data } = await api.GET('/v1/admin/auth/me');
    if (data && data.role !== 'CUSTOMER') setState({ status: 'signedIn', user: data });
    else setState({ status: 'signedOut' });
  }, []);

  useEffect(() => {
    onSessionEnded(() =>
      setState((s) =>
        s.status === 'signedIn' || s.status === 'expired'
          ? { status: 'expired', user: s.user }
          : { status: 'signedOut' },
      ),
    );
    let cancelled = false;
    void refreshSession().then(async (ok) => {
      if (cancelled) return;
      if (ok) await loadMe();
      else setState({ status: 'signedOut' });
    });
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const { data, error } = await api.POST('/v1/admin/auth/login', { body: { phone, password } });
    if (!data) return errorMessage(error, 'Phone or password is incorrect');
    if (data.user.role === 'CUSTOMER') return 'This account cannot use the dashboard';
    setAccessToken(data.accessToken);
    setState({ status: 'signedIn', user: data.user });
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await api.POST('/v1/admin/auth/logout');
    setAccessToken(null);
    setState({ status: 'signedOut' });
  }, []);

  return <AuthContext.Provider value={{ state, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth outside AuthProvider');
  return auth;
}
