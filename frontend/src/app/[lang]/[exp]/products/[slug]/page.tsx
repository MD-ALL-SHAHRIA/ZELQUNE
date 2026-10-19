import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductView } from '@/features/analytics/product-view';
import { ProductGallery } from '@/features/catalog/product-gallery';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { Purchase } from '@/features/catalog/purchase';
import { SaleBadge } from '@/features/catalog/sale-badge';
import { ValuesBand } from '@/features/layout/footer';
import { Rooms } from '@/features/landing/rooms';
import { getProduct, listDistricts } from '@/shared/api/server';
import { jsonForScript, productJsonLd } from '@/shared/lib/json-ld';
import { resolvePage } from '@/shared/lib/page-params';
import { alternates, href, SITE_URL } from '@/shared/lib/site';
import { Accordion } from '@/shared/ui/accordion';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Heading, Lead } from '@/shared/ui/typography';

export const revalidate = 300;

// ISR: paths are rendered on first request, then cached (an empty list enables runtime ISR).
export function generateStaticParams() {
  return [];
}

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
  const images = productImages(product.media, name, lang, product.slug);
  const category = product.categories[0];
  const faq = dict.faq.items;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonForScript(productJsonLd(product, name, description, url)),
        }}
      />
      <ProductView
        productId={product.id}
        variantId={product.variants[0]?.id}
        pricePaisa={product.variants[0]?.price?.amountPaisa}
      />
      <Container className="pb-28 pt-6 lg:pb-24 lg:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href={href(lang)} className="hover:text-ink">
                {dict.nav.home}
              </Link>
              <span aria-hidden> / </span>
            </li>
            {category ? (
              <li>
                <Link href={href(lang, `/category/${category.slug}`)} className="hover:text-ink">
                  {lang === 'bn' ? category.nameBn : category.nameEn}
                </Link>
                <span aria-hidden> / </span>
              </li>
            ) : null}
            <li aria-current="page" className="text-ink">
              {name}
            </li>
          </ol>
        </nav>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-20 [&>*]:min-w-0">
          <ProductGallery images={images} note={dict.landing.sampleNote} />
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="space-y-6">
              <SaleBadge
                dict={dict}
                lang={lang}
                saleMode={product.saleMode}
                leadTimeDays={product.leadTimeDays}
              />
              <Heading as="h1" level="h1">
                {name}
              </Heading>
              <Lead>{description}</Lead>
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
                <p className="border-l-2 border-amber bg-glow/25 px-5 py-4 text-sm leading-relaxed">
                  {dict.product.preOrderNote}
                </p>
              ) : null}
              <Accordion
                defaultOpen="details"
                items={[
                  {
                    id: 'details',
                    title: dict.productSections.details,
                    body: (
                      <ul className="space-y-2">
                        {(copy?.whatYouGet ?? []).map((line) => (
                          <li key={line} className="flex gap-3">
                            <span
                              aria-hidden
                              className="mt-2.5 size-1 shrink-0 rounded-full bg-walnut"
                            />
                            <span>
                              <CopyText>{line}</CopyText>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                  {
                    id: 'delivery',
                    title: dict.productSections.delivery,
                    body: [faq[4]?.a, dict.terms.items[0], dict.terms.items[1]]
                      .filter(Boolean)
                      .join(' '),
                  },
                  {
                    id: 'care',
                    title: dict.productSections.care,
                    body: [faq[3]?.a, faq[2]?.a].filter(Boolean).join(' '),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Container>
      <ValuesBand dict={dict} />
      <Rooms dict={dict} />
    </>
  );
}
