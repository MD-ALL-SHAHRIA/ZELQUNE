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
  let volumetric = 0;
  for (const line of lines) {
    actual += line.qty * (line.packageWeightGrams ?? config.defaultPackageWeightGrams);
    const { packageLengthMm: l, packageWidthMm: w, packageHeightMm: h } = line;
    if (l && w && h) {
      const cubicCm = (l / 10) * (w / 10) * (h / 10);
      volumetric += line.qty * ((cubicCm / config.volumetricDivisor) * 1000);
    }
  }
  const volumetricWeightGrams = Math.ceil(volumetric);
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
