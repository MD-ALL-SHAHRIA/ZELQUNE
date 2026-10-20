import type { Metadata } from 'next';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { Prose } from '@/shared/ui/prose';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.privacy.title} · ${dict.brand.name}`,
    alternates: alternates(lang, '/privacy'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { dict } = await resolvePage(params);
  return (
    <>
      <PageHeader eyebrow={dict.layout.columns.company} title={dict.privacy.title} />
      <Prose items={[dict.privacy.text]} />
    </>
  );
}
