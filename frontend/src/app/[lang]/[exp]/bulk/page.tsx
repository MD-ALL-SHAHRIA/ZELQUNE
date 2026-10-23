import type { Metadata } from 'next';
import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { productName } from '@/features/catalog/product-copy';
import { RfqForm } from '@/features/quotes/rfq-form';
import { TrustBand } from '@/features/trust/trust-band';

import { listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.bulk.heading} · ${dict.brand.name}`,
    description: dict.bulk.text,
    alternates: alternates(lang, '/bulk'),
  };
}

export default async function BulkPage({ params }: { params: PageParams }) {
  const { lang, segment, dict } = await resolvePage(params);
  const products = (await listProducts(segment)).map((p) => ({
    slug: p.slug,
    name: productName(p, lang, dict),
  }));
  return (
    <>
      <section className="relative isolate flex min-h-[64svh] items-end overflow-hidden bg-ink text-paper">
        <Image
          src={SAMPLE.cafe.src}
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(53,58,48,0.35)_0%,rgba(53,58,48,0.25)_40%,rgba(53,58,48,0.88)_100%)] lg:bg-[linear-gradient(90deg,rgba(53,58,48,0.8)_0%,rgba(53,58,48,0.35)_55%,rgba(53,58,48,0.1)_100%)]"
        />
        <Container className="space-y-7 pb-14 pt-32 sm:pb-20">
          <Eyebrow className="flex items-center gap-4 text-paper/80">
            <span aria-hidden className="h-px w-10 bg-amber" />
            {dict.landing.businessEyebrow}
          </Eyebrow>
          <Heading as="h1" level="h1" className="max-w-4xl">
            {dict.bulk.heading}
          </Heading>
          <p className="max-w-2xl text-base leading-relaxed text-paper/85 sm:text-lg">
            {dict.bulk.text}
          </p>
        </Container>
        <p className="absolute bottom-3 right-4 text-[0.6rem] text-paper/50">
          {dict.landing.sampleNote}
        </p>
      </section>
      <section className="bg-cream/50">
        <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[1fr_1.9fr] lg:gap-20 xl:gap-28">
          <div className="space-y-8 lg:sticky lg:top-40 lg:self-start">
            <div className="space-y-6">
              <Eyebrow>{dict.landing.businessEyebrow}</Eyebrow>
              <Heading>{dict.bulk.button}</Heading>
              <Lead>{dict.home.bulkBanner}</Lead>
            </div>
            <ul className="border-t border-line">
              {dict.bulk.whoOrders.map((who) => (
                <li
                  key={who}
                  className="flex items-baseline gap-5 border-b border-line py-4 text-sm"
                >
                  <span aria-hidden className="block bg-walnut h-px w-8" />
                  {who}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 border border-line bg-paper p-5 shadow-[0_30px_80px_-40px_rgba(53,58,48,0.18)] sm:p-10 lg:p-12">
            <RfqForm
              lang={lang}
              products={products}
              copy={{ bulk: dict.bulk, checkout: dict.checkout }}
            />
          </div>
        </Container>
      </section>
      <TrustBand dict={dict} />
    </>
  );
}
