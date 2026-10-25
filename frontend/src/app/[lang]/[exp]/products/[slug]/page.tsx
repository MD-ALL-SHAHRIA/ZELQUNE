import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductView } from '@/features/analytics/product-view';
import { CompleteTheWall, type PairItem } from '@/features/catalog/complete-the-wall.client';
import { ShareButton } from '@/features/catalog/share-button.client';
import { priceCopy } from '@/features/offers/price-tag';
import { relatedProducts } from '@/features/catalog/listing-data';
import { ProductGallery } from '@/features/catalog/product-gallery';
import { productImages } from '@/features/catalog/product-images';
import { chatMessage, productName } from '@/features/catalog/product-copy';
import { Purchase } from '@/features/catalog/purchase';
import { RelatedProducts } from '@/features/catalog/related-products';
import { SaleBadge, saleBadgeText } from '@/features/catalog/sale-badge';
import { pieceAspect } from '@/features/visualizer/geometry';
import { VisualizerButton } from '@/features/visualizer/visualizer-button';
import { getProduct, listDistricts } from '@/shared/api/server';
import { jsonForScript, productJsonLd } from '@/shared/lib/json-ld';
import { resolvePage } from '@/shared/lib/page-params';
import { alternates, href, SITE_URL } from '@/shared/lib/site';
import { whatsappHref } from '@/shared/lib/whatsapp';
import { Accordion } from '@/shared/ui/accordion';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { ChatLink, ConfidenceCard, MadeForYou } from '@/features/catalog/purchase.extras';

export const revalidate = 60;

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
    // The share image is the branded card from ./opengraph-image.tsx.
    openGraph: { title: name, description, type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { lang, segment, dict, product, copy, name, description } = await load(params);
  const category = product.categories[0];
  const [districts, related] = await Promise.all([
    listDistricts(),
    relatedProducts(segment, product.slug, category?.slug),
  ]);
  const preOrder = product.saleMode !== 'IN_STOCK';
  const url = `${SITE_URL}${href(lang, `/products/${product.slug}`)}`;
  const images = productImages(product.media, name, lang, product.slug);
  const faq = dict.faq.items;
  const chat = whatsappHref(chatMessage(dict, name));
  const dims = product.variants[0]?.dimensions;
  const hero = images[0];
  // "Complete the wall": up to three related pieces sold the same way (a cart holds one sale
  // mode), each with its first finish and live price.
  const pairs: PairItem[] = (
    await Promise.all(
      related
        .filter((p) => p.saleMode === product.saleMode)
        .slice(0, 3)
        .map(async (p) => {
          const detail = await getProduct(p.slug, segment).catch(() => null);
          const v = detail?.variants.find((x) => x.price);
          if (!detail || !v?.price) return null;
          const pairName = productName(detail, lang, dict);
          const img = productImages(detail.media, pairName, lang, detail.slug)[0];
          return {
            productId: detail.id,
            variantId: v.id,
            slug: detail.slug,
            name: pairName,
            image: img ? { src: img.src, alt: img.alt } : null,
            unitPricePaisa: v.price.amountPaisa,
            regularPaisa: v.price.sale?.regularPaisa ?? null,
          };
        }),
    )
  ).filter((x): x is PairItem => x !== null);
  const visualizer = hero ? (
    <VisualizerButton
      key="visualizer"
      label={dict.premium.visualizer.open}
      slug={product.slug}
      piece={{
        src: hero.src,
        alt: name,
        sample: hero.sample,
        aspect: dims?.widthMm && dims.heightMm ? pieceAspect(dims) : null,
      }}
      copy={{
        text: dict.premium.visualizer,
        close: dict.ui.close,
        sampleNote: dict.landing.sampleNote,
      }}
    />
  ) : null;
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
      <Container className="pb-20 pt-5 lg:pb-24 lg:pt-7">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-stone lg:mb-7">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href={href(lang)} className="transition-colors hover:text-ink">
                {dict.nav.home}
              </Link>
            </li>
            <li aria-hidden>/</li>
            {category ? (
              <>
                <li>
                  <Link
                    href={href(lang, `/category/${category.slug}`)}
                    className="transition-colors hover:text-ink"
                  >
                    {lang === 'bn' ? category.nameBn : category.nameEn}
                  </Link>
                </li>
                <li aria-hidden>/</li>
              </>
            ) : null}
            <li aria-current="page" className="text-ink">
              {name}
            </li>
          </ol>
        </nav>
        {/* Apex-style layout: gallery and its accordions on the left; the buying decision on the
            right (sticky), with delivery and trust right under the buttons, then cross-sell.
            Phones: gallery, buying, then the accordions. */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20 [&>*]:min-w-0">
          <ProductGallery
            images={images}
            note={dict.landing.sampleNote}
            lang={lang}
            photoCount={dict.ui.photoCount}
            closeLabel={dict.ui.close}
          />
          <div className="lg:sticky lg:top-36 lg:row-span-2 lg:self-start">
            <div className="space-y-7">
              <div className="space-y-4">
                {category ? (
                  <Eyebrow>
                    <Link
                      href={href(lang, `/category/${category.slug}`)}
                      className="transition-colors hover:text-ink"
                    >
                      {lang === 'bn' ? category.nameBn : category.nameEn}
                    </Link>
                  </Eyebrow>
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <Heading as="h1" level="h1">
                    {name}
                  </Heading>
                  <ShareButton
                    url={url}
                    title={name}
                    copy={{ share: dict.product.share, linkCopied: dict.product.linkCopied }}
                  />
                </div>
                <SaleBadge
                  dict={dict}
                  lang={lang}
                  saleMode={product.saleMode}
                  leadTimeDays={product.leadTimeDays}
                />
                {description ? <Lead className="text-pretty">{description}</Lead> : null}
              </div>
              <Purchase
                product={{ id: product.id, variants: product.variants, saleMode: product.saleMode }}
                districts={districts}
                lang={lang}
                sizeAction={visualizer}
                copy={{
                  price: priceCopy(dict),
                  variantLabel: dict.product.variantLabel,
                  variants: dict.product.variants,
                  addToCart: dict.product.addToCart,
                  preOrderNow: dict.product.preOrderNow,
                  buyNow: dict.product.buyNow,
                  sizeLabel: dict.product.sizeLabel,
                  size: dict.product.size,
                  deliveryHeading: dict.product.deliveryHeading,
                  preOrderNote: preOrder ? dict.product.preOrderNote : undefined,
                  deliveryFee: dict.product.deliveryFee,
                  estimate: dict.product.estimate,
                  unavailable: dict.product.unavailable,
                  preOrder,
                  leadTime: saleBadgeText(dict, lang, product.saleMode, product.leadTimeDays),
                }}
                afterCta={
                  <div key="after-cta" className="space-y-3">
                    <ConfidenceCard key="confidence" dict={dict} />
                    {chat ? (
                      <ChatLink key="chat" href={chat} label={dict.premium.chat.label} />
                    ) : null}
                  </div>
                }
              />
              <CompleteTheWall
                items={pairs}
                lang={lang}
                copy={{
                  heading: dict.product.completeTheWall,
                  note: dict.product.completeNote,
                  add: dict.product.add,
                  added: dict.product.addedShort,
                }}
              />
            </div>
          </div>
          <div className="lg:pt-2">
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
                ...(preOrder
                  ? [
                      {
                        id: 'made',
                        title: dict.premium.madeForYou,
                        body: (
                          <MadeForYou
                            dict={dict}
                            lang={lang}
                            leadTimeDays={product.leadTimeDays}
                            bare
                          />
                        ),
                      },
                    ]
                  : []),
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
      </Container>
      <RelatedProducts
        products={related}
        lang={lang}
        dict={dict}
        eyebrow={category ? (lang === 'bn' ? category.nameBn : category.nameEn) : dict.nav.shop}
      />
      {/* Phones: room under the footer for the sticky purchase bar while it shows. */}
      <style>{`@media (max-width:1023.98px){body:has([data-sticky-bar]){padding-bottom:var(--sticky-bar-h)}}`}</style>
    </>
  );
}
