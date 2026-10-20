import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrackOrder } from '@/features/orders/track-order';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { HelpLayout } from '@/features/help/help-layout';
import { TrustBand } from '@/features/trust/trust-band';

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
    <>
      <PageHeader eyebrow={dict.nav.track} title={dict.track.heading} />
      <HelpLayout lang={lang} dict={dict} current="/track">
        <Suspense fallback={null}>
          <TrackOrder
            lang={lang}
            copy={{
              track: dict.track,
              checkout: dict.checkout,
              ui: dict.ui,
              products: dict.products,
              product: dict.product,
            }}
          />
        </Suspense>
      </HelpLayout>
      <TrustBand dict={dict} />
    </>
  );
}
