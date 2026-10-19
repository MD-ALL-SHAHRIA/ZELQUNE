import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Gallery } from '@/components/product/gallery';
import { Purchase } from '@/components/product/purchase';
import { SaleBadge } from '@/components/sale-badge';
import { Text } from '@/components/text';
import { getProduct, listDistricts } from '@/lib/api-server';
import { jsonForScript, productJsonLd } from '@/lib/json-ld';
import { resolvePage } from '@/lib/page-params';
import { productName } from '@/lib/product-copy';
import { alternates, href, SITE_URL } from '@/lib/site';

export const revalidate = 300;

type Params = Promise<{ lang: string; exp: string; slug: string }>;

async function load(params: Params) {
  const page = await resolvePage(params);
  const { slug } = await params;
  const product = await getProduct(slug, page.segment);
  if (!product) notFound();
  const copy = page.dict.products[product.slug];
  const name = productName(product, page.lang, page.dict);
  const description =
    copy?.short ?? (page.lang === 'bn' ? product.descriptionBn : product.descriptionEn) ?? '';
  return { ...page, product, copy, name, description };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, product, name, description, dict } = await load(params);
  const seoTitle = lang === 'bn' ? product.seo.titleBn : product.seo.titleEn;
  return {
    title: seoTitle ?? `${name} · ${dict.brand.name}`,
    description:
      (lang === 'bn' ? product.seo.descriptionBn : product.seo.descriptionEn) ?? description,
    alternates: alternates(lang, `/products/${product.slug}`),
    openGraph: {
      title: name,
      description,
      type: 'website',
      ...(product.primaryMedia ? { images: [product.primaryMedia.url] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { lang, dict, product, copy, name, description } = await load(params);
  const districts = await listDistricts();
  const preOrder = product.saleMode !== 'IN_STOCK';
  const url = `${SITE_URL}${href(lang, `/products/${product.slug}`)}`;
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonForScript(productJsonLd(product, name, description, url)),
        }}
      />
      <Gallery media={product.media} name={name} lang={lang} dict={dict} />
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold text-walnut">{name}</h1>
        <SaleBadge
          dict={dict}
          lang={lang}
          saleMode={product.saleMode}
          leadTimeDays={product.leadTimeDays}
        />
        <p className="text-lg">{description}</p>
        <Purchase
          product={{ id: product.id, variants: product.variants, saleMode: product.saleMode }}
          districts={districts}
          lang={lang}
          copy={{
            variantLabel: dict.product.variantLabel,
            variants: dict.product.variants,
            addToCart: dict.product.addToCart,
            preOrderNow: dict.product.preOrderNow,
            deliveryFee: dict.product.deliveryFee,
            estimate: dict.product.estimate,
            unavailable: dict.product.unavailable,
            preOrder,
          }}
        />
        {preOrder ? (
          <p className="rounded-lg border border-amber bg-amber/15 p-4 text-sm">
            {dict.product.preOrderNote}
          </p>
        ) : null}
        {copy?.whatYouGet.length ? (
          <section>
            <h2 className="mb-2 text-xl font-semibold text-walnut">
              {dict.product.whatYouGetHeading}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              {copy.whatYouGet.map((line) => (
                <li key={line}>
                  <Text>{line}</Text>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
