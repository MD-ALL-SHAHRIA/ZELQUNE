import type { Metadata } from 'next';
import { Bullets, ContentPage } from '@/components/content-page';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.terms.title} · ${dict.brand.name}`,
    alternates: alternates(lang, '/terms'),
  };
}

export default async function Page({ params }: { params: PageParams }) {
  const { dict } = await resolvePage(params);
  return (
    <ContentPage title={dict.terms.title}>
      <Bullets items={dict.terms.items} />
    </ContentPage>
  );
}
