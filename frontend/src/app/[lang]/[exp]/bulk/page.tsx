import type { Metadata } from 'next';
import { RfqForm } from '@/components/bulk/rfq-form';
import { listProducts } from '@/lib/api-server';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { productName } from '@/lib/product-copy';
import { alternates } from '@/lib/site';

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
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-walnut">{dict.bulk.heading}</h1>
      <p className="text-lg">{dict.bulk.text}</p>
      <ul className="flex flex-wrap gap-2">
        {dict.bulk.whoOrders.map((who) => (
          <li key={who} className="rounded-full bg-surface px-3 py-1 text-sm ring-1 ring-line">
            {who}
          </li>
        ))}
      </ul>
      <RfqForm
        lang={lang}
        products={products}
        copy={{ bulk: dict.bulk, checkout: dict.checkout }}
      />
    </div>
  );
}
