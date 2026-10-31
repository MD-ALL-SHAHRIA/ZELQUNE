import { href } from '@/shared/lib/site';
import { CookieBanner } from '@/features/consent/cookie-banner';
import { Suspense, ViewTransition } from 'react';
import { SiteAnalytics } from '@/features/analytics/site-analytics';
import { WhatsappFab } from '@/features/chat/whatsapp-fab';
import { Footer } from '@/features/layout/footer';
import { Header } from '@/features/layout/header';
import { buildSearchIndex } from '@/features/layout/search-index';
import { getHomeContent, withContent } from '@/shared/api/content';
import { getActiveSale, listCategories, listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';

// Rendered on first request, then cached (ISR); builds never need the backend.
export function generateStaticParams() {
  return [];
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: PageParams;
}) {
  const { lang, segment, dict: base } = await resolvePage(params);
  // Navigation never breaks the page: without the catalog the menu has no categories and
  // search finds only pages.
  const [categories, products, content, sale] = await Promise.all([
    listCategories().catch(() => []),
    listProducts(segment).catch(() => []),
    getHomeContent(),
    getActiveSale(),
  ]);
  // The owner's announcement and contact details from the dashboard (built-in copy otherwise).
  const dict = withContent(base, content, lang);
  return (
    <>
      {/* Cookie choice first in the tab order (it is fixed at the foot of the screen). */}
      <CookieBanner
        copy={{
          ...dict.consent,
        }}
        policyHref={href(lang, '/cookies')}
      />
      <Header
        lang={lang}
        dict={dict}
        categories={categories}
        searchIndex={buildSearchIndex(lang, products)}
        sale={sale}
      />
      {/* Page changes cross-fade the content softly (globals.css, .zq-page); header and footer
          stay still. Without View Transitions support the page simply swaps. */}
      <ViewTransition update="zq-page" default="none">
        <main id="main">{children}</main>
      </ViewTransition>
      <Footer lang={lang} dict={dict} categories={categories} contact={content?.contact} />
      <WhatsappFab dict={dict} number={content?.contact.whatsapp} />
      <Suspense fallback={null}>
        <SiteAnalytics />
      </Suspense>
    </>
  );
}
