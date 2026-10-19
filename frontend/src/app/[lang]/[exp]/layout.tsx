import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { resolvePage, type PageParams } from '@/lib/page-params';

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
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <Footer lang={lang} dict={dict} />
    </>
  );
}
