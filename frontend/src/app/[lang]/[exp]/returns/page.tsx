import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { Prose } from '@/shared/ui/prose';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.returns.title} · ${dict.brand.name}`,
    alternates: alternates(lang, '/returns'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { dict } = await resolvePage(params);
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.help} title={dict.returns.title} />
      <Prose
        items={[
          dict.terms.items[2] ?? '',
          dict.terms.items[3] ?? '',
          dict.terms.items[4] ?? '',
          dict.faq.items[6]?.a ?? '',
        ]}
      />
    </>
  );
}
