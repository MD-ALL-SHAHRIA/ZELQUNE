import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrackOrder } from '@/components/track/track-order';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.track.heading} · ${dict.brand.name}`,
    alternates: alternates(lang, '/track'),
  };
}

export default async function TrackPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-walnut">{dict.track.heading}</h1>
      <Suspense fallback={null}>
        <TrackOrder
          lang={lang}
          copy={{
            track: dict.track,
            checkout: dict.checkout,
            ui: dict.ui,
            names: {},
            variants: dict.product.variants,
          }}
        />
      </Suspense>
    </div>
  );
}
