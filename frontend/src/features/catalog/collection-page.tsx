import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/shared/api/types';
import { PageHeader } from '@/shared/ui/page-header';
import { Container } from '@/shared/ui/typography';
import { ProductCard } from './product-card';

export function CollectionPage(props: {
  title: string;
  eyebrow: string;
  products: ProductSummary[];
  lang: Locale;
  dict: Dictionary;
}) {
  return (
    <>
      <PageHeader
        eyebrow={props.eyebrow}
        title={props.title}
        lead={props.dict.brand.seoDescription}
      />
      <Container className="py-16 sm:py-20">
        {props.products.length ? (
          <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {props.products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                lang={props.lang}
                dict={props.dict}
                priority={i < 2}
              />
            ))}
          </div>
        ) : (
          <p className="font-display text-2xl font-light text-stone">{props.dict.shop.empty}</p>
        )}
      </Container>
    </>
  );
}
