import { type ProductDetail } from '@/shared/api/types';

const AVAILABILITY: Record<ProductDetail['saleMode'], string> = {
  IN_STOCK: 'https://schema.org/InStock',
  PRE_ORDER: 'https://schema.org/PreOrder',
  MADE_TO_ORDER: 'https://schema.org/MadeToOrder',
};

/** schema.org Product; a pre-order is never marked InStock. */
export function productJsonLd(
  product: ProductDetail,
  name: string,
  description: string,
  url: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: { '@type': 'Brand', name: 'Zelqune' },
    ...(product.media.length ? { image: product.media.map((m) => m.url) } : {}),
    offers: product.variants
      .filter((v) => v.price)
      .map((v) => ({
        '@type': 'Offer',
        sku: v.sku,
        url,
        priceCurrency: 'BDT',
        price: ((v.price?.amountPaisa ?? 0) / 100).toFixed(2),
        availability: AVAILABILITY[product.saleMode],
      })),
  };
}

/** JSON for a <script> tag: `<` escaped so content can never close the tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
