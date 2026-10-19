import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { Accordion } from '@/shared/ui/accordion';
import { PageHeader } from '@/shared/ui/page-header';
import { Container } from '@/shared/ui/typography';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return { title: `${dict.faq.title} · ${dict.brand.name}`, alternates: alternates(lang, '/faq') };
}

export default async function FaqPage({ params }: { params: PageParams }) {
  const { dict } = await resolvePage(params);
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.help} title={dict.faq.title} />
      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Accordion
            defaultOpen="faq-0"
            items={dict.faq.items.map((item, i) => ({
              id: `faq-${i}`,
              title: item.q,
              body: item.a,
            }))}
          />
        </div>
      </Container>
    </>
  );
}
