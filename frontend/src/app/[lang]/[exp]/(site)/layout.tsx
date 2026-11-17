import { WhatsappFab } from '@/features/chat/whatsapp-fab';
import { Footer } from '@/features/layout/footer';
import { Header } from '@/features/layout/header';
import { Motion } from '@/features/layout/motion';
import { buildSearchIndex } from '@/features/layout/search-index';
import { getHomeContent, withContent } from '@/shared/api/content';
import { businessLine } from '@/shared/lib/business';
import { getActiveSale, listCategories, listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';

/** The shop's pages: header, footer and the WhatsApp button around the content. */
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
      <Header
        lang={lang}
        dict={dict}
        categories={categories}
        searchIndex={buildSearchIndex(lang, products)}
        sale={sale}
      />
      {/* Page changes swap at once: a transition here held every click back by about 0.35 s. */}
      <main id="main">{children}</main>
      <Footer
        lang={lang}
        dict={dict}
        categories={categories}
        contact={content?.contact}
        business={businessLine(content?.business, lang, dict.legal.business.licence)}
      />
      <WhatsappFab dict={dict} number={content?.contact.whatsapp} />
      <Motion />
    </>
  );
}
