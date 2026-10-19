import type { Metadata } from 'next';
import { Bullets, ContentPage } from '@/components/content-page';
import { Text } from '@/components/text';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

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
    <ContentPage title={dict.returns.title}>
      <Bullets
        items={[dict.terms.items[2] ?? '', dict.terms.items[3] ?? '', dict.terms.items[4] ?? '']}
      />
      <p className="text-lg">
        <Text>{dict.faq.items[6]?.a ?? ''}</Text>
      </p>
    </ContentPage>
  );
}
