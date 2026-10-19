import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/lib/api-types';
import { ProductCard } from './product-card';

export function ProductGridPage(props: {
  title: string;
  products: ProductSummary[];
  lang: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-walnut">{props.title}</h1>
      {props.products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.products.map((p) => (
            <ProductCard key={p.id} product={p} lang={props.lang} dict={props.dict} />
          ))}
        </div>
      ) : (
        <p>{props.dict.shop.empty}</p>
      )}
    </div>
  );
}
