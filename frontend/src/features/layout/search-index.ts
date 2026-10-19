import 'server-only';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { getDictionary } from '@/i18n';
import { type Locale } from '@/i18n/config';
import { formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { haystackOf, type SearchIndex } from './search';

/** The header's search index: every product plus the service and help pages, in both languages. */
export function buildSearchIndex(lang: Locale, products: ProductSummary[]): SearchIndex {
  const dict = getDictionary(lang);
  const en = getDictionary('en');
  const bn = getDictionary('bn');
  const pages: { path: string; label: (d: typeof en) => string }[] = [
    { path: '/design', label: (d) => d.nav2.design },
    { path: '/construction', label: (d) => d.header.construction },
    { path: '/bulk', label: (d) => d.nav.bulk },
    { path: '/story', label: (d) => d.layout.story },
    { path: '/faq', label: (d) => d.nav.faq },
    { path: '/track', label: (d) => d.nav.track },
  ];
  return {
    products: products.map((p) => {
      const title = productName(p, lang, dict);
      const [image] = productImages(p.primaryMedia ? [p.primaryMedia] : [], title, lang, p.slug);
      return {
        href: href(lang, `/products/${p.slug}`),
        title,
        haystack: haystackOf(
          productName(p, 'en', en),
          productName(p, 'bn', bn),
          p.nameEn,
          p.nameBn,
          p.slug.replace(/-/g, ' '),
        ),
        price: p.fromPrice ? formatTaka(p.fromPrice.amountPaisa, lang) : null,
        image: image ? { src: image.src, alt: image.alt } : null,
      };
    }),
    pages: pages.map(({ path, label }) => ({
      href: href(lang, path),
      title: label(dict),
      haystack: haystackOf(label(en), label(bn), path.slice(1)),
    })),
  };
}
