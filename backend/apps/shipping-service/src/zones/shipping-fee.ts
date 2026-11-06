import { type ParcelLine, type ShippingZoneCode } from '@zelqune/contracts';

export interface FeeConfig {
  feesPaisa: Record<ShippingZoneCode, number>;
  baseWeightGrams: number;
  extraPerKgPaisa: number;
  volumetricDivisor: number;
  defaultPackageWeightGrams: number;
}

export interface WeightBreakdown {
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  /** max(actual, volumetric) rounded up to the next whole kg. */
  chargeableWeightGrams: number;
}

/**
 * Chargeable weight = max(actual, volumetric) where volumetric (kg) = L x W x H (cm) / divisor.
 * Lines without packaged dimensions contribute no volumetric weight; lines without a packaged
 * weight use the configured default.
 */
export function chargeableWeight(lines: ParcelLine[], config: FeeConfig): WeightBreakdown {
  let actual = 0;
  let cubicMm = 0;
  for (const line of lines) {
    actual += line.qty * (line.packageWeightGrams ?? config.defaultPackageWeightGrams);
    const { packageLengthMm: l, packageWidthMm: w, packageHeightMm: h } = line;
    if (l && w && h) cubicMm += line.qty * l * w * h;
  }
  // grams = cm³ / divisor * 1000 = mm³ / divisor. Integer maths: float cm conversions could add a
  // stray gram and bill an extra kg at exact kg boundaries.
  const volumetricWeightGrams = Math.ceil(cubicMm / config.volumetricDivisor);
  const chargeableKg = Math.max(1, Math.ceil(Math.max(actual, volumetricWeightGrams) / 1000));
  return {
    actualWeightGrams: actual,
    volumetricWeightGrams,
    chargeableWeightGrams: chargeableKg * 1000,
  };
}

/** Zone base fee covers the base weight; each started extra kg adds extraPerKgPaisa. */
export function shippingFee(
  zone: ShippingZoneCode,
  chargeableWeightGrams: number,
  config: FeeConfig,
): number {
  const extraKg = Math.max(0, Math.ceil((chargeableWeightGrams - config.baseWeightGrams) / 1000));
  return config.feesPaisa[zone] + extraKg * config.extraPerKgPaisa;
}
