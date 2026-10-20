import { Suspense } from 'react';
import { SiteAnalytics } from '@/features/analytics/site-analytics';
import { Footer } from '@/features/layout/footer';
import { Header } from '@/features/layout/header';
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
  return (
    <>
      <Header lang={lang} dict={dict} />
      <main id="main">{children}</main>
      <Footer lang={lang} dict={dict} />
      <Suspense fallback={null}>
        <SiteAnalytics />
      </Suspense>
    </>
  );
}
