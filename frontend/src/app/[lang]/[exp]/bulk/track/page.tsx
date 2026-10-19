import type { Metadata } from 'next';
import { Suspense } from 'react';
import { QuoteTrack } from '@/components/bulk/quote-track';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.bulk.trackHeading} · ${dict.brand.name}`,
    alternates: alternates(lang, '/bulk/track'),
  };
}

export default async function QuoteTrackPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-walnut">{dict.bulk.trackHeading}</h1>
      <Suspense fallback={null}>
        <QuoteTrack lang={lang} copy={{ bulk: dict.bulk, checkout: dict.checkout, ui: dict.ui }} />
      </Suspense>
    </div>
  );
}
