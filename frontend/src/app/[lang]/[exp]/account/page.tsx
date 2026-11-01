import type { Metadata } from 'next';
import { AccountPortal } from '@/features/account/account-portal';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { Container } from '@/shared/ui/typography';

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.auth.portalTitle} · ${dict.brand.name}`,
    alternates: alternates(lang, '/account'),
    robots: { index: false, follow: false },
  };
}

/** The signed-in customer's page (ADR 0021); signed-out visitors are sent to sign in. */
export default async function AccountPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <Container className="max-w-4xl py-14 sm:py-20">
      <AccountPortal
        lang={lang}
        copy={dict.auth}
        phoneError={dict.checkout.errors.phone}
        statuses={{ orders: dict.track.statuses, requests: dict.bulk.statuses }}
      />
    </Container>
  );
}
