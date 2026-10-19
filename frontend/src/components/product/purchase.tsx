'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { Text } from '@/components/text';
import { type Locale } from '@/i18n/config';
import { fill, formatTaka } from '@/i18n/format';
import { api, ok } from '@/lib/api-browser';
import { type District, type ProductDetail } from '@/lib/api-types';
import { href } from '@/lib/site';

export interface PurchaseCopy {
  variantLabel: string;
  variants: Record<string, string | undefined>;
  addToCart: string;
  preOrderNow: string;
  deliveryFee: string;
  estimate: { district: string; choose: string; result: string; failed: string };
  unavailable: string;
  preOrder: boolean;
}

type Variant = ProductDetail['variants'][number];

const optionValue = (v: Variant) =>
  Object.values(v.options).find((x): x is string => typeof x === 'string') ?? v.sku;

/** Variant picker, price, add-to-cart and the delivery fee estimate for the chosen variant. */
export function Purchase({
  product,
  districts,
  lang,
  copy,
}: {
  product: Pick<ProductDetail, 'id' | 'variants' | 'saleMode'>;
  districts: District[];
  lang: Locale;
  copy: PurchaseCopy;
}) {
  const router = useRouter();
  const { add, busy } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const variant = product.variants.find((v) => v.id === variantId);
  const [district, setDistrict] = useState('');
  const [estimate, setEstimate] = useState<{ text: string; failed: boolean } | null>(null);

  async function updateEstimate(code: string, forVariant: string) {
    setDistrict(code);
    setEstimate(null);
    if (!code || !forVariant) return;
    const name = districts.find((d) => d.code === code);
    try {
      const result = ok(
        await api.GET('/v1/shipping/estimate', {
          params: { query: { district: code, variantId: forVariant, qty: 1 } },
        }),
      );
      setEstimate({
        text: fill(copy.estimate.result, {
          district: (lang === 'bn' ? name?.nameBn : name?.nameEn) ?? code,
          fee: formatTaka(result.feePaisa, lang),
        }),
        failed: false,
      });
    } catch {
      setEstimate({ text: copy.estimate.failed, failed: true });
    }
  }

  async function buy(goToCheckout: boolean) {
    if (!variant?.price) return;
    const added = await add(
      {
        productId: product.id,
        variantId: variant.id,
        qty: 1,
        unitPricePaisa: variant.price.amountPaisa,
      },
      { openDrawer: !goToCheckout },
    );
    if (added && goToCheckout) router.push(href(lang, '/checkout'));
  }

  const sorted = [...districts].sort((a, b) =>
    (lang === 'bn' ? a.nameBn : a.nameEn).localeCompare(lang === 'bn' ? b.nameBn : b.nameEn),
  );

  return (
    <div className="space-y-5">
      {variant?.price ? (
        <p data-testid="price" className="text-3xl font-semibold">
          {formatTaka(variant.price.amountPaisa, lang)}
        </p>
      ) : (
        <p className="text-danger">{copy.unavailable}</p>
      )}

      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="mb-2 font-semibold">{copy.variantLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <label
                key={v.id}
                className="cursor-pointer rounded-md border border-line bg-surface px-4 py-2 has-[:checked]:border-walnut has-[:checked]:ring-2 has-[:checked]:ring-walnut"
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => {
                    setVariantId(v.id);
                    if (district) void updateEstimate(district, v.id);
                  }}
                  className="sr-only"
                />
                {copy.variants[optionValue(v)] ?? optionValue(v)}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {copy.preOrder ? (
          <button
            type="button"
            disabled={busy || !variant?.price}
            onClick={() => buy(true)}
            className="rounded-md bg-walnut px-6 py-3 font-semibold text-cream disabled:opacity-50"
          >
            {copy.preOrderNow}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || !variant?.price}
          onClick={() => buy(false)}
          className={
            copy.preOrder
              ? 'rounded-md border border-walnut px-6 py-3 font-semibold text-walnut disabled:opacity-50'
              : 'rounded-md bg-walnut px-6 py-3 font-semibold text-cream disabled:opacity-50'
          }
        >
          {copy.addToCart}
        </button>
      </div>

      <div className="space-y-2 rounded-lg bg-surface p-4 ring-1 ring-line">
        <label htmlFor="estimate-district" className="block text-sm font-semibold">
          {copy.estimate.district}
        </label>
        <select
          id="estimate-district"
          value={district}
          onChange={(e) => void updateEstimate(e.target.value, variantId)}
          className="w-full rounded-md border border-line bg-cream px-3 py-2"
        >
          <option value="">{copy.estimate.choose}</option>
          {sorted.map((d) => (
            <option key={d.code} value={d.code}>
              {lang === 'bn' ? d.nameBn : d.nameEn}
            </option>
          ))}
        </select>
        <p
          aria-live="polite"
          data-testid="delivery-estimate"
          className={estimate?.failed ? 'text-sm text-danger' : 'text-sm'}
        >
          <Text>{estimate?.text ?? copy.deliveryFee}</Text>
        </p>
      </div>
    </div>
  );
}
