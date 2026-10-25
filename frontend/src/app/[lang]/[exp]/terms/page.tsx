import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { Clauses, HelpLayout } from '@/features/help/help-layout';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.terms.title} · ${dict.brand.name}`,
    alternates: alternates(lang, '/terms'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.help} title={dict.terms.title} />
      <HelpLayout lang={lang} dict={dict} current="/terms">
        <Clauses lang={lang} items={dict.terms.items} />
      </HelpLayout>
    </>
  );
}
