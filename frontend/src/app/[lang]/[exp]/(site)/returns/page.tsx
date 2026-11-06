import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { getHomeContent } from '@/shared/api/content';
import { businessLine } from '@/shared/lib/business';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { HelpLayout, PolicyBody } from '@/features/help/help-layout';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.legal.returns.title} · ${dict.brand.name}`,
    description: dict.legal.returns.intro,
    alternates: alternates(lang, '/returns'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  const b = dict.legal.business;
  const business = businessLine((await getHomeContent())?.business, lang, b.licence) ?? b.pending;
  const policy = dict.legal.returns;
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.help} title={policy.title} />
      <HelpLayout lang={lang} dict={dict} current="/returns">
        <PolicyBody
          policy={policy}
          updated={dict.legal.updated}
          contact={dict.legal.contact}
          business={business}
        />
      </HelpLayout>
    </>
  );
}
