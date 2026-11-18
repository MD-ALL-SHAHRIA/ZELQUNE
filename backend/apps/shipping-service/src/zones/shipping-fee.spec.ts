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
  it('does not bill an extra kg from float rounding at an exact kg boundary', () => {
    const box = {
      qty: 1,
      packageWeightGrams: 500,
      packageLengthMm: 250,
      packageWidthMm: 352,
      packageHeightMm: 500,
    };
    // 250 x 352 x 500 mm / 4000 = exactly 11000 g (float cm maths gave 11001 g -> 12 kg)
    expect(chargeableWeight([box], { ...config, volumetricDivisor: 4000 })).toMatchObject({
      volumetricWeightGrams: 11000,
      chargeableWeightGrams: 11000,
    });
  });

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

  it('with no per-kg charge, every order in a zone pays the same flat fee', () => {
    const flat = {
      ...config,
      extraPerKgPaisa: 0,
      feesPaisa: { DHAKA: 6000, SUBURB: 9000, OUTSIDE: 12000 },
    };
    expect(shippingFee('DHAKA', 1000, flat)).toBe(6000);
    expect(shippingFee('DHAKA', 62000, flat)).toBe(6000);
    expect(shippingFee('OUTSIDE', 18000, flat)).toBe(12000);
  });

  it('bills actual weight when volumetric weight is off (a big, light panel stays cheap)', () => {
    // Fluted Niche Panel (190 x 95 x 15 cm, 15 kg) + Capsule Vase Light (76 x 42 x 12 cm, 3 kg):
    // by box size that is 62 kg; by actual weight 18 kg.
    const lines = [
      {
        qty: 1,
        packageWeightGrams: 15000,
        packageLengthMm: 1900,
        packageWidthMm: 950,
        packageHeightMm: 150,
      },
      {
        qty: 1,
        packageWeightGrams: 3000,
        packageLengthMm: 760,
        packageWidthMm: 420,
        packageHeightMm: 120,
      },
    ];
    const actualOnly = {
      ...config,
      volumetricDivisor: 0,
      feesPaisa: { DHAKA: 6000, SUBURB: 9000, OUTSIDE: 12000 },
      extraPerKgPaisa: 1000,
    };
    const w = chargeableWeight(lines, actualOnly);
    expect(w).toMatchObject({ volumetricWeightGrams: 0, chargeableWeightGrams: 18000 });
    expect(shippingFee('DHAKA', w.chargeableWeightGrams, actualOnly)).toBe(6000 + 17 * 1000);
    expect(chargeableWeight(lines, config).chargeableWeightGrams).toBe(62000);
  });

  it('decides the zone exactly from an area code, and pickup is free', () => {
    expect(zoneFor('dhaka', 'mirpur')).toBe('DHAKA');
    expect(zoneFor('dhaka', 'savar')).toBe('SUBURB');
    expect(zoneFor('dhaka', 'keraniganj')).toBe('SUBURB');
    expect(zoneFor('gazipur', 'kaliakair')).toBe('SUBURB');
    expect(zoneFor('sylhet', 'sylhet-sadar')).toBe('OUTSIDE');
    expect(zoneFor('sylhet', 'sylhet-sadar', 'PICKUP')).toBe('PICKUP');
    expect(shippingFee('PICKUP', 9000, config)).toBe(0);
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
