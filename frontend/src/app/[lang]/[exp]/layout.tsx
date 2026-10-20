import { Suspense, ViewTransition } from 'react';
import { SiteAnalytics } from '@/features/analytics/site-analytics';
import { WhatsappFab } from '@/features/chat/whatsapp-fab';
import { Footer } from '@/features/layout/footer';
import { Header } from '@/features/layout/header';
import { buildSearchIndex } from '@/features/layout/search-index';
import { listCategories, listProducts } from '@/shared/api/server';
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
  const { lang, segment, dict } = await resolvePage(params);
  // Navigation never breaks the page: without the catalog the menu has no categories and
  // search finds only pages.
  const [categories, products] = await Promise.all([
    listCategories().catch(() => []),
    listProducts(segment).catch(() => []),
  ]);
  return (
    <>
      <Header
        lang={lang}
        dict={dict}
        categories={categories}
        searchIndex={buildSearchIndex(lang, products)}
      />
      {/* Page changes cross-fade the content softly (globals.css, .zq-page); header and footer
          stay still. Without View Transitions support the page simply swaps. */}
      <ViewTransition update="zq-page" default="none">
        <main id="main">{children}</main>
      </ViewTransition>
      <Footer lang={lang} dict={dict} categories={categories} />
      <WhatsappFab dict={dict} />
      <Suspense fallback={null}>
        <SiteAnalytics />
      </Suspense>
    </>
  );
}
