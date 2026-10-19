import { type ShippingEnv } from '../config/shipping-env';
import { type PrismaService } from '../prisma/prisma.service';
import { FakeCourierProvider, ManualCourierProvider } from './courier.provider';
import { ShippingService } from './shipping.service';

const config = {
  SHIPPING_FEE_DHAKA_PAISA: 7000,
  SHIPPING_FEE_SUBURB_PAISA: 11000,
  SHIPPING_FEE_OUTSIDE_PAISA: 13000,
  SHIPPING_BASE_WEIGHT_GRAMS: 1000,
  SHIPPING_EXTRA_PER_KG_PAISA: 2000,
  SHIPPING_VOLUMETRIC_DIVISOR: 5000,
  SHIPPING_DEFAULT_PACKAGE_WEIGHT_GRAMS: 1000,
} as ShippingEnv;

const aloArch = {
  qty: 1,
  packageWeightGrams: 2500,
  packageLengthMm: 700,
  packageWidthMm: 400,
  packageHeightMm: 100,
};

describe('ShippingService', () => {
  const prisma = {
    shipment: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...args.data }),
      ),
    },
  } as unknown as PrismaService;
  const fake = new FakeCourierProvider('STEADFAST');
  const service = new ShippingService(prisma, config, [new ManualCourierProvider(), fake]);

  it('quotes by district/area with chargeable weight', () => {
    expect(service.quote({ district: 'dhaka', area: 'Mirpur', lines: [aloArch] })).toEqual({
      zone: 'DHAKA',
      district: 'dhaka',
      actualWeightGrams: 2500,
      volumetricWeightGrams: 5600,
      chargeableWeightGrams: 6000,
      feePaisa: 17000,
    });
    expect(service.quote({ district: 'dhaka', area: 'Savar', lines: [aloArch] }).feePaisa).toBe(
      21000,
    );
    expect(service.quote({ district: 'Sylhet', lines: [aloArch] }).feePaisa).toBe(23000);
  });

  it('rejects unknown districts', () => {
    expect(() => service.quote({ district: 'atlantis', lines: [aloArch] })).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_DISTRICT' }) as Error,
    );
  });

  it('MANUAL shipments are BOOKED only with a consignment id; unconfigured couriers are rejected', async () => {
    const orderId = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';
    await expect(
      service.createShipment({ orderId, courier: 'MANUAL', consignmentId: 'SF123' }),
    ).resolves.toMatchObject({ status: 'BOOKED', consignmentId: 'SF123' });
    await expect(service.createShipment({ orderId, courier: 'MANUAL' })).resolves.toMatchObject({
      status: 'PENDING',
    });
    await expect(service.createShipment({ orderId, courier: 'STEADFAST' })).resolves.toMatchObject({
      status: 'BOOKED',
      consignmentId: 'FAKE-0b6f0a3e',
    });
    await expect(service.createShipment({ orderId, courier: 'PATHAO' })).rejects.toMatchObject({
      code: 'COURIER_NOT_CONFIGURED',
    });
  });
});
