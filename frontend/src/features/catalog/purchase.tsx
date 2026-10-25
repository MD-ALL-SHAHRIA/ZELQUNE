'use client';

import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/features/cart/use-cart';
import { PriceTag, type PriceCopy } from '@/features/offers/price-tag';
import { type Locale } from '@/i18n/config';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { type District, type ProductDetail } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { Button } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Select } from '@/shared/ui/field';
import { useLazyShippingEstimateQuery } from '@/store/api';
import { finishColor, variantValue } from './finishes';

export interface PurchaseCopy {
  price: PriceCopy;
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
  buyNow: string;
  sizeLabel: string;
  /** "{w} × {h} cm" template. */
  size: string;
  deliveryHeading: string;
  /** Pre-orders: how the advance works (shown in the delivery card). */
  preOrderNote?: string;
}

const label =
  'text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal';

/**
 * Price, finish swatches, the size, Buy now / Add to cart, then the delivery card with the
 * estimate for the chosen finish. `afterCta` (server-rendered: confidence card, chat, cross-sell)
 * follows it. On phones a
 * slim bar with the price and the main button slides up once the buttons scroll out of view.
 */
export function Purchase({
  product,
  districts,
  lang,
  copy,
  afterCta,
  sizeAction,
}: {
  product: Pick<ProductDetail, 'id' | 'variants' | 'saleMode'>;
  districts: District[];
  lang: Locale;
  copy: PurchaseCopy;
  afterCta?: React.ReactNode;
  /** Beside the size (e.g. "See it on your wall"), where the size is decided. */
  sizeAction?: React.ReactNode;
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
  // Apex pattern: one primary action that goes straight to checkout, "Add to cart" beside it.
  const primaryLabel = copy.preOrder ? copy.preOrderNow : copy.buyNow;
  const dims = variant?.dimensions;
  const cm = (mm: number) => formatNumber(Math.round(mm / 10), lang);
  const sizeText =
    dims?.widthMm && dims.heightMm
      ? fill(copy.size, { w: cm(dims.widthMm), h: cm(dims.heightMm) })
      : null;
  const finishName = (v: (typeof product.variants)[number]) => {
    const value = variantValue(v);
    return copy.variants[value] ?? value;
  };

  return (
    <div className="space-y-8">
      {variant?.price ? (
        <PriceTag price={variant.price} lang={lang} copy={copy.price} size="page" />
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

      {sizeText || sizeAction ? (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-line py-3.5">
          <p className="flex items-baseline gap-3">
            <span className={label}>{copy.sizeLabel}</span>
            {sizeText ? <span className="text-sm tabular-nums text-ink">{sizeText}</span> : null}
          </p>
          {sizeAction}
        </div>
      ) : null}

      <div className="space-y-6">
        <div ref={ctaRef} className="grid gap-3">
          <Button size="lg" disabled={busy || !variant?.price} onClick={() => buy(true)}>
            {primaryLabel}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={busy || !variant?.price}
            onClick={() => buy(false)}
          >
            {copy.addToCart}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Delivery card (Apex pattern: delivery assurance right under the buttons). */}
        <section aria-labelledby="delivery-card" className="bg-cream/70 p-5">
          <h2
            id="delivery-card"
            className="flex items-center gap-2.5 text-[0.95rem] font-medium text-ink"
          >
            <Truck aria-hidden strokeWidth={1.4} className="size-[1.15rem] text-walnut" />
            {copy.deliveryHeading}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
            <div className="sm:pr-5">
              {copy.leadTime ? (
                <p className="text-[0.82rem] font-medium leading-snug text-ink">
                  <CopyText>{copy.leadTime}</CopyText>
                </p>
              ) : null}
              {copy.preOrderNote ? (
                <p className="mt-1.5 text-xs leading-relaxed text-ink/65">
                  <CopyText>{copy.preOrderNote}</CopyText>
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:pl-5">
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
                className={cn(
                  'text-xs leading-relaxed text-ink/75',
                  isError && 'text-danger',
                  isFetching && 'opacity-50',
                )}
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
          </div>
        </section>
        {afterCta}
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
              <p className="font-display text-[1.6rem] font-medium leading-none tabular-nums">
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
