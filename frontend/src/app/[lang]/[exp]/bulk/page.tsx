import type { Metadata } from 'next';
import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { productName } from '@/features/catalog/product-copy';
import { RfqForm } from '@/features/quotes/rfq-form';
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
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <Image
          src={SAMPLE.cafe.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover opacity-50"
        />
        <Container className="space-y-6 py-24 sm:py-32">
          <Eyebrow className="text-paper/70">{dict.landing.businessEyebrow}</Eyebrow>
          <Heading as="h1" level="h1" className="max-w-4xl">
            {dict.bulk.heading}
          </Heading>
          <p className="max-w-2xl text-lg text-paper/85">{dict.bulk.text}</p>
          <ul className="flex flex-wrap gap-2 pt-2">
            {dict.bulk.whoOrders.map((who) => (
              <li key={who} className="border border-paper/30 px-3 py-1.5 text-xs tracking-wide">
                {who}
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[1fr_2fr] lg:gap-24">
        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <Heading level="h3">{dict.bulk.button}</Heading>
          <Lead className="text-base">{dict.home.bulkBanner}</Lead>
        </div>
        <RfqForm
          lang={lang}
          products={products}
          copy={{ bulk: dict.bulk, checkout: dict.checkout }}
        />
      </Container>
    </>
  );
}
