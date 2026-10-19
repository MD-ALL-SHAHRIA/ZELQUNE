import type { Metadata } from 'next';
import { Suspense } from 'react';
import { QuoteTrack } from '@/features/quotes/quote-track';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { PageHeader } from '@/shared/ui/page-header';
import { Container } from '@/shared/ui/typography';

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
    <>
      <PageHeader eyebrow={dict.landing.businessEyebrow} title={dict.bulk.trackHeading} />
      <Container className="py-16">
        <Suspense fallback={null}>
          <QuoteTrack
            lang={lang}
            copy={{ bulk: dict.bulk, checkout: dict.checkout, ui: dict.ui }}
          />
        </Suspense>
      </Container>
    </>
  );
}
