import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { HelpLayout, PolicyBody } from '@/features/help/help-layout';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.legal.terms.title} · ${dict.brand.name}`,
    description: dict.legal.terms.intro,
    alternates: alternates(lang, '/terms'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const policy = dict.legal.terms;
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.help} title={policy.title} />
      <HelpLayout lang={lang} dict={dict} current="/terms">
        <PolicyBody policy={policy} updated={dict.legal.updated} contact={dict.legal.contact} />
      </HelpLayout>
    </>
  );
}
