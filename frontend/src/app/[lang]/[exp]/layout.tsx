import { Suspense } from 'react';
import { SiteAnalytics } from '@/features/analytics/site-analytics';
import { Footer } from '@/features/layout/footer';
import { Header } from '@/features/layout/header';
import { listCategories } from '@/shared/api/server';
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
  const { lang, dict } = await resolvePage(params);
  // Navigation never breaks the page: without the catalog the menu just has no categories.
  const categories = await listCategories().catch(() => []);
  return (
    <>
      <Header lang={lang} dict={dict} categories={categories} />
      <main id="main">{children}</main>
      <Footer lang={lang} dict={dict} categories={categories} />
      <Suspense fallback={null}>
        <SiteAnalytics />
      </Suspense>
    </>
  );
}
