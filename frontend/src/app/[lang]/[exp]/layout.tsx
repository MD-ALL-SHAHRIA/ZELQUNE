import { NetworkStatus } from '@/features/network/network-status';
import { ContentProtection } from '@/features/layout/content-protection';
import { href } from '@/shared/lib/site';
import { CookieBanner } from '@/features/consent/cookie-banner';
import { Suspense } from 'react';
import { SiteAnalytics } from '@/features/analytics/site-analytics';
import { getHomeContent, withContent } from '@/shared/api/content';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';

// Rendered on first request, then cached (ISR); builds never need the backend.
export function generateStaticParams() {
  return [];
}

/**
 * What every storefront page has: network notice, cookie choice and analytics. The site header
 * and footer live in (site)/layout.tsx; sign-in pages ((auth)) go without them.
 */
export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: PageParams;
}) {
  const { lang, dict: base } = await resolvePage(params);
  const dict = withContent(base, await getHomeContent(), lang);
  return (
    <>
      {/* Cookie choice first in the tab order (it is fixed at the foot of the screen). */}
      <NetworkStatus copy={dict.network} />
      <ContentProtection />
      <CookieBanner
        copy={{
          ...dict.consent,
        }}
        policyHref={href(lang, '/cookies')}
      />
      {children}
      <Suspense fallback={null}>
        <SiteAnalytics />
      </Suspense>
    </>
  );
}
