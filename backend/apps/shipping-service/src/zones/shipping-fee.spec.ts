import { DISTRICTS, zoneFor } from './districts';
import { chargeableWeight, type FeeConfig, shippingFee } from './shipping-fee';

const config: FeeConfig = {
  feesPaisa: { DHAKA: 7000, SUBURB: 11000, OUTSIDE: 13000 },
  baseWeightGrams: 1000,
  extraPerKgPaisa: 2000,
  volumetricDivisor: 5000,
  defaultPackageWeightGrams: 1000,
};

const aloArch = {
  qty: 1,
  packageWeightGrams: 2500,
  packageLengthMm: 700,
  packageWidthMm: 400,
  packageHeightMm: 100,
};

describe('shipping fees', () => {
  it('Alo-Arch Panel: 2.5 kg actual vs 5.6 kg volumetric -> 6 kg chargeable', () => {
    expect(chargeableWeight([aloArch], config)).toEqual({
      actualWeightGrams: 2500,
      volumetricWeightGrams: 5600,
      chargeableWeightGrams: 6000,
    });
  });

  it.each([
    ['DHAKA', 7000 + 5 * 2000],
    ['SUBURB', 11000 + 5 * 2000],
    ['OUTSIDE', 13000 + 5 * 2000],
  ] as const)('%s fee for 6 kg = %i paisa', (zone, fee) => {
    expect(shippingFee(zone, 6000, config)).toBe(fee);
  });

  it('first kg is the base fee; every started extra kg costs ৳20', () => {
    expect(shippingFee('DHAKA', 1000, config)).toBe(7000);
    expect(shippingFee('DHAKA', 2000, config)).toBe(9000);
    const light = {
      qty: 1,
      packageWeightGrams: 300,
      packageLengthMm: 100,
      packageWidthMm: 100,
      packageHeightMm: 50,
    };
    expect(chargeableWeight([light], config).chargeableWeightGrams).toBe(1000);
    const justOver = {
      qty: 1,
      packageWeightGrams: 1001,
      packageLengthMm: null,
      packageWidthMm: null,
      packageHeightMm: null,
    };
    expect(chargeableWeight([justOver], config).chargeableWeightGrams).toBe(2000);
  });

  it('sums quantities and falls back to the default package weight', () => {
    const unknown = {
      qty: 3,
      packageWeightGrams: null,
      packageLengthMm: null,
      packageWidthMm: null,
      packageHeightMm: null,
    };
    expect(chargeableWeight([unknown, { ...aloArch, qty: 2 }], config)).toEqual({
      actualWeightGrams: 3000 + 5000,
      volumetricWeightGrams: 11200,
      chargeableWeightGrams: 12000,
    });
  });

  it('uses the configured volumetric divisor', () => {
    expect(
      chargeableWeight([aloArch], { ...config, volumetricDivisor: 6000 }).volumetricWeightGrams,
    ).toBe(4667);
  });
});

describe('zones', () => {
  it('has all 64 districts with unique codes', () => {
    expect(DISTRICTS).toHaveLength(64);
    expect(new Set(DISTRICTS.map((d) => d.code)).size).toBe(64);
  });

  it('maps Dhaka city, its suburbs, Gazipur/Narayanganj and everything else', () => {
    expect(zoneFor('dhaka', 'Dhanmondi')).toBe('DHAKA');
    expect(zoneFor('dhaka', 'Savar')).toBe('SUBURB');
    expect(zoneFor('dhaka', 'আশুলিয়া')).toBe('SUBURB');
    expect(zoneFor('dhaka', 'South Keraniganj')).toBe('SUBURB');
    expect(zoneFor('gazipur', 'Tongi')).toBe('SUBURB');
    expect(zoneFor('narayanganj')).toBe('SUBURB');
    expect(zoneFor('chattogram', 'Agrabad')).toBe('OUTSIDE');
  });
});
