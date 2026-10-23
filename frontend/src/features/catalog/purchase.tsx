'use client';

import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

const label =
  'text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal';

/**
 * Price, finish swatches, the buy buttons and the delivery estimate for the chosen finish.
 * `afterCta` (server-rendered: promises, timeline, chat) sits right under the buttons. On phones a
 * slim bar with the price and the main button slides up once the buttons scroll out of view.
 */
export function Purchase({
  product,
  districts,
  lang,
  copy,
  afterCta,
}: {
  product: Pick<ProductDetail, 'id' | 'variants' | 'saleMode'>;
  districts: District[];
  lang: Locale;
  copy: PurchaseCopy;
  afterCta?: React.ReactNode;
}) {
  const router = useRouter();
  const { add, busy } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const variant = product.variants.find((v) => v.id === variantId);
  const [district, setDistrict] = useState('');
  const [estimate, { data: fee, isError, isFetching }] = useLazyShippingEstimateQuery();
  const ctaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);

  // The sticky bar shows only after the main buttons have scrolled up out of view.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    // The root extends far below the viewport, so "not intersecting" means "scrolled past".
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) setBarVisible(!entry.isIntersecting);
      },
      { rootMargin: '0px 0px 100000px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Floating UI (WhatsApp button) sits above the bar: its exact height feeds --sticky-bar-h.
  useEffect(() => {
    const root = document.documentElement;
    const h = barRef.current?.offsetHeight;
    if (barVisible && h) root.style.setProperty('--sticky-bar-height', `${h}px`);
    return () => {
      root.style.removeProperty('--sticky-bar-height');
    };
  }, [barVisible]);

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
  const compareAt =
    variant?.price?.compareAtPaisa && variant.price.compareAtPaisa > variant.price.amountPaisa
      ? formatTaka(variant.price.compareAtPaisa, lang)
      : null;
  const primaryLabel = copy.preOrder ? copy.preOrderNow : copy.addToCart;
  const finishName = (v: (typeof product.variants)[number]) => {
    const value = variantValue(v);
    return copy.variants[value] ?? value;
  };

  return (
    <div className="space-y-8">
      {price ? (
        <div className="flex items-baseline gap-4">
          <p
            data-testid="price"
            className="font-display text-[2.6rem] font-light leading-none tabular-nums sm:text-[2.9rem]"
          >
            {price}
          </p>
          {compareAt ? (
            <del className="font-display text-2xl font-light tabular-nums text-stone">
              {compareAt}
            </del>
          ) : null}
        </div>
      ) : (
        <p className="text-danger">{copy.unavailable}</p>
      )}

      {product.variants.length > 1 ? (
        <fieldset>
          <legend className="mb-3 flex w-full items-baseline gap-3">
            <span className={label}>{copy.variantLabel}</span>
            {variant ? (
              <span aria-hidden className="text-sm text-ink">
                {finishName(variant)}
              </span>
            ) : null}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {product.variants.map((v) => {
              const value = variantValue(v);
              return (
                <label
                  key={v.id}
                  className="group/finish flex cursor-pointer items-center gap-3 border border-line bg-paper px-3 py-3 transition-colors duration-300 hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:bg-surface has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
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
                    className="size-7 shrink-0 rounded-full ring-1 ring-ink/15 ring-offset-2 ring-offset-paper transition-shadow group-has-[:checked]/finish:ring-ink"
                    style={{ background: finishColor(value) }}
                  />
                  <span className="min-w-0 text-sm leading-snug">{finishName(v)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-6">
        <div ref={ctaRef} className="grid gap-3">
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
        {afterCta}
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
        <label htmlFor="estimate-district" className={cn('block', label)}>
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

      {/* Phones: the buy button stays reachable once the main buttons scroll away. */}
      {price ? (
        <div
          ref={barRef}
          data-sticky-bar={barVisible ? '' : undefined}
          aria-hidden={!barVisible}
          inert={!barVisible}
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(43,30,25,0.35)] backdrop-blur-md transition-[transform,opacity] duration-500 ease-out-soft lg:hidden',
            barVisible
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-full opacity-0',
          )}
        >
          <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 md:px-10">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.6rem] font-light leading-none tabular-nums">
                {price}
              </p>
              {variant && product.variants.length > 1 ? (
                <p className="mt-1 truncate text-xs text-stone">{finishName(variant)}</p>
              ) : null}
            </div>
            <Button
              disabled={busy}
              onClick={() => buy(copy.preOrder)}
              className="h-12 shrink-0 px-6"
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
