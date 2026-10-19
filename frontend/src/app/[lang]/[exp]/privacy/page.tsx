import type { Metadata } from 'next';
import { ContentPage } from '@/components/content-page';
import { Text } from '@/components/text';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

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
    <ContentPage title={dict.privacy.title}>
      <p className="text-lg">
        <Text>{dict.privacy.text}</Text>
      </p>
    </ContentPage>
  );
}
