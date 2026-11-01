import type { Metadata } from 'next';
import { Suspense } from 'react';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { AuthShell } from './auth-shell';
import {
  CompleteForm,
  ForgotForm,
  LoginForm,
  RegisterForm,
  ResetForm,
  SignedInRedirect,
  VerifyView,
} from './auth-forms';

export type AuthKind =
  'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'complete' | 'signedIn';

const FORMS = {
  login: LoginForm,
  register: RegisterForm,
  verify: VerifyView,
  forgot: ForgotForm,
  reset: ResetForm,
  complete: CompleteForm,
  signedIn: SignedInRedirect,
};

function heading(kind: AuthKind, c: Awaited<ReturnType<typeof resolvePage>>['dict']['auth']) {
  return {
    login: { title: c.loginTitle, lead: c.loginLead },
    register: { title: c.registerTitle, lead: c.registerLead },
    verify: { title: c.verifiedTitle, lead: undefined },
    forgot: { title: c.forgotTitle, lead: c.forgotLead },
    reset: { title: c.resetTitle, lead: undefined },
    complete: { title: c.completeTitle, lead: c.completeLead },
    signedIn: { title: c.loginTitle, lead: undefined },
  }[kind];
}

/** Sign-in pages are private: never indexed. */
export async function authMetadata(params: PageParams, kind: AuthKind): Promise<Metadata> {
  const { dict } = await resolvePage(params);
  return {
    title: `${heading(kind, dict.auth).title} · ${dict.brand.name}`,
    robots: { index: false, follow: false },
  };
}

export async function AuthPage({ params, kind }: { params: PageParams; kind: AuthKind }) {
  const { lang, dict } = await resolvePage(params);
  const c = dict.auth;
  const Form = FORMS[kind];
  const { title, lead } = heading(kind, c);
  return (
    <AuthShell brandTitle={c.brandTitle} brandText={c.brandText} title={title} lead={lead}>
      <Suspense>
        <Form
          lang={lang}
          copy={c}
          privacyLink={dict.checkout.privacyNotice.link}
          phoneError={dict.checkout.errors.phone}
        />
      </Suspense>
    </AuthShell>
  );
}
