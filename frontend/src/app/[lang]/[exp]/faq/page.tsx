import type { Metadata } from 'next';
import { ContentPage } from '@/components/content-page';
import { Text } from '@/components/text';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return { title: `${dict.faq.title} · ${dict.brand.name}`, alternates: alternates(lang, '/faq') };
}

export default async function FaqPage({ params }: { params: PageParams }) {
  const { dict } = await resolvePage(params);
  return (
    <ContentPage title={dict.faq.title}>
      <div className="space-y-3">
        {dict.faq.items.map((item) => (
          <details key={item.q} className="rounded-lg bg-surface p-4 ring-1 ring-line">
            <summary className="cursor-pointer font-semibold text-walnut">{item.q}</summary>
            <p className="mt-2">
              <Text>{item.a}</Text>
            </p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
