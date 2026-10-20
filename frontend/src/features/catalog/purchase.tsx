'use client';

import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/features/cart/use-cart';
import { type Locale } from '@/i18n/config';
import { fill, formatTaka } from '@/i18n/format';
import { type District, type ProductDetail } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { Button } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Select } from '@/shared/ui/field';
import { useLazyShippingEstimateQuery } from '@/store/api';
import { finishColor, variantValue } from './finishes';

export interface PurchaseCopy {
  variantLabel: string;
  variants: Record<string, string | undefined>;
  addToCart: string;
  preOrderNow: string;
  deliveryFee: string;
  estimate: { district: string; choose: string; result: string; failed: string };
  unavailable: string;
  preOrder: boolean;
  /** Lead-time line for the sale mode (e.g. "Made to order · 21 days"). */
  leadTime?: string;
}

/** Variant swatches, price, add-to-cart and the delivery estimate for the chosen finish. */
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
  const [estimate, { data: fee, isError, isFetching }] = useLazyShippingEstimateQuery();

  const districtName = (code: string) => {
    const d = districts.find((x) => x.code === code);
    return (lang === 'bn' ? d?.nameBn : d?.nameEn) ?? code;
  };
  const updateEstimate = (code: string, forVariant: string) => {
    setDistrict(code);
    if (code && forVariant) void estimate({ district: code, variantId: forVariant, qty: 1 }, true);
  };

  async function buy(goToCheckout: boolean) {
    if (!variant?.price) return;
    const added = await add({
      productId: product.id,
      variantId: variant.id,
      qty: 1,
      unitPricePaisa: variant.price.amountPaisa,
      openDrawer: !goToCheckout,
    });
    if (added && goToCheckout) router.push(href(lang, '/checkout'));
  }

  const sorted = [...districts].sort((a, b) =>
    (lang === 'bn' ? a.nameBn : a.nameEn).localeCompare(lang === 'bn' ? b.nameBn : b.nameEn),
  );
  const price = variant?.price ? formatTaka(variant.price.amountPaisa, lang) : null;
  const primaryLabel = copy.preOrder ? copy.preOrderNow : copy.addToCart;

  return (
    <div className="space-y-8">
      {price ? (
        <p
          data-testid="price"
          className="font-display text-[2.6rem] font-light leading-none tabular-nums"
        >
          {price}
        </p>
      ) : (
        <p className="text-danger">{copy.unavailable}</p>
      )}

      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="mb-3 text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
            {copy.variantLabel}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {product.variants.map((v) => {
              const value = variantValue(v);
              const name = copy.variants[value] ?? value;
              return (
                <label
                  key={v.id}
                  className="flex cursor-pointer items-center gap-3 border border-line bg-paper px-3 py-3 transition-colors hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:shadow-[inset_0_0_0_1px_var(--color-ink)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={v.id === variantId}
                    onChange={() => {
                      setVariantId(v.id);
                      if (district) updateEstimate(district, v.id);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className="size-8 shrink-0 rounded-full border border-paper ring-1 ring-ink/15"
                    style={{ background: finishColor(value) }}
                  />
                  <span className="min-w-0 text-sm leading-snug">{name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-3">
        <Button size="lg" disabled={busy || !variant?.price} onClick={() => buy(copy.preOrder)}>
          {primaryLabel}
        </Button>
        {copy.preOrder ? (
          <Button
            size="lg"
            variant="outline"
            disabled={busy || !variant?.price}
            onClick={() => buy(false)}
          >
            {copy.addToCart}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3 border border-line bg-surface/60 p-5">
        {copy.leadTime ? (
          <p className="flex items-start gap-3 text-sm">
            <Truck aria-hidden strokeWidth={1.25} className="mt-0.5 size-5 shrink-0" />
            <span>
              <CopyText>{copy.leadTime}</CopyText>
            </span>
          </p>
        ) : null}
        <label
          htmlFor="estimate-district"
          className="block text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:tracking-normal"
        >
          {copy.estimate.district}
        </label>
        <Select
          id="estimate-district"
          value={district}
          onChange={(e) => updateEstimate(e.target.value, variantId)}
        >
          <option value="">{copy.estimate.choose}</option>
          {sorted.map((d) => (
            <option key={d.code} value={d.code}>
              {lang === 'bn' ? d.nameBn : d.nameEn}
            </option>
          ))}
        </Select>
        <p
          aria-live="polite"
          data-testid="delivery-estimate"
          className={cn('text-sm', isError && 'text-danger', isFetching && 'opacity-50')}
        >
          <CopyText>
            {!district
              ? copy.deliveryFee
              : isError
                ? copy.estimate.failed
                : fee
                  ? fill(copy.estimate.result, {
                      district: districtName(district),
                      fee: formatTaka(fee.feePaisa, lang),
                    })
                  : copy.deliveryFee}
          </CopyText>
        </p>
      </div>

      {/* Mobile: the buy button stays reachable while reading. */}
      {price ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-line bg-paper px-5 py-3 lg:hidden">
          <span className="font-display text-2xl font-light tabular-nums">{price}</span>
          <Button disabled={busy} onClick={() => buy(copy.preOrder)} className="flex-1">
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
