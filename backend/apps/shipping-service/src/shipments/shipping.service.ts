import { Inject, Injectable, Optional } from '@nestjs/common';
import { APP_CONFIG, AppError, OutboxService, recordAudit } from '@zelqune/common';
import {
  createShipmentInputSchema,
  type CreateShipmentInput,
  type DistrictView,
  type ShipmentSummary,
  type ShippingQuote,
  shippingQuoteRequestSchema,
  type ShippingQuoteRequest,
  updateShipmentStatusInputSchema,
  type UpdateShipmentStatusInput,
} from '@zelqune/contracts';
import { type ShippingEnv } from '../config/shipping-env';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingSettingsService } from '../settings/shipping-settings';
import { DISTRICTS, DISTRICTS_BY_CODE, zoneFor } from '../zones/districts';
import { chargeableWeight, type FeeConfig, shippingFee } from '../zones/shipping-fee';
import { COURIER_PROVIDERS, type CourierProvider } from './courier.provider';
import { canTransitionShipment } from './shipment-state';

const SOURCE = 'shipping-service';

@Injectable()
export class ShippingService {
  private readonly fees: FeeConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) config: ShippingEnv,
    @Inject(COURIER_PROVIDERS) private readonly couriers: CourierProvider[],
    /** Owner-edited fees (ADR 0017); without it (unit tests) the env fees apply. */
    @Optional() private readonly settings?: ShippingSettingsService,
  ) {
    this.fees = {
      feesPaisa: {
        DHAKA: config.SHIPPING_FEE_DHAKA_PAISA,
        SUBURB: config.SHIPPING_FEE_SUBURB_PAISA,
        OUTSIDE: config.SHIPPING_FEE_OUTSIDE_PAISA,
      },
      baseWeightGrams: config.SHIPPING_BASE_WEIGHT_GRAMS,
      extraPerKgPaisa: config.SHIPPING_EXTRA_PER_KG_PAISA,
      volumetricDivisor: config.SHIPPING_VOLUMETRIC_DIVISOR,
      defaultPackageWeightGrams: config.SHIPPING_DEFAULT_PACKAGE_WEIGHT_GRAMS,
    };
  }

  districts(): { items: DistrictView[] } {
    return { items: [...DISTRICTS] };
  }

  async quote(raw: ShippingQuoteRequest): Promise<ShippingQuote> {
    const { district, area, lines } = shippingQuoteRequestSchema.parse(raw);
    if (!DISTRICTS_BY_CODE.has(district))
      throw new AppError('UNKNOWN_DISTRICT', 'Unknown district', 422);
    const fees = await this.currentFees();
    const zone = zoneFor(district, area);
    const weight = chargeableWeight(lines, fees);
    return {
      zone,
      district,
      ...weight,
      feePaisa: shippingFee(zone, weight.chargeableWeightGrams, fees),
    };
  }

  private async currentFees(): Promise<FeeConfig> {
    if (!this.settings) return this.fees;
    const s = await this.settings.value();
    return {
      ...this.fees,
      feesPaisa: { DHAKA: s.dhakaFeePaisa, SUBURB: s.suburbFeePaisa, OUTSIDE: s.outsideFeePaisa },
      baseWeightGrams: s.baseWeightGrams,
      extraPerKgPaisa: s.extraPerKgPaisa,
    };
  }

  async shipmentByOrder(orderId: string): Promise<ShipmentSummary | null> {
    const s = await this.prisma.shipment.findUnique({ where: { orderId } });
    return s
      ? {
          courier: s.courier,
          status: s.status,
          consignmentId: s.consignmentId,
          trackingUrl: s.trackingUrl,
        }
      : null;
  }

  /** Admin: create (and for MANUAL with a consignment id, book) the shipment for an order. */
  async createShipment(raw: CreateShipmentInput): Promise<ShipmentSummary> {
    const input = createShipmentInputSchema.parse(raw);
    const provider = this.couriers.find((c) => c.courier === input.courier);
    if (!provider)
      throw new AppError('COURIER_NOT_CONFIGURED', `${input.courier} is not configured yet`, 422);
    if (await this.prisma.shipment.findUnique({ where: { orderId: input.orderId } })) {
      throw new AppError('SHIPMENT_EXISTS', 'This order already has a shipment', 409);
    }
    const booking = await provider.book({
      orderId: input.orderId,
      consignmentId: input.consignmentId,
      trackingUrl: input.trackingUrl,
    });
    const status = booking.booked ? 'BOOKED' : 'PENDING';
    const shipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId: input.orderId,
          courier: input.courier,
          consignmentId: booking.consignmentId,
          trackingUrl: booking.trackingUrl,
          status,
          history: { create: { from: null, to: status } },
        },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'shipment.create',
        entityType: 'order',
        entityId: input.orderId,
        summary: `Shipment created: ${input.courier}${booking.consignmentId ? ` ${booking.consignmentId}` : ''} (${status})`,
        changes: { courier: input.courier, consignmentId: booking.consignmentId, status },
      });
      return created;
    });
    return {
      courier: shipment.courier,
      status: shipment.status,
      consignmentId: shipment.consignmentId,
      trackingUrl: shipment.trackingUrl,
    };
  }

  /** Admin: move a shipment along its state machine. */
  async updateStatus(raw: UpdateShipmentStatusInput): Promise<ShipmentSummary> {
    const { orderId, status } = updateShipmentStatusInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shipments WHERE order_id = ${orderId}::uuid FOR UPDATE`;
      const current = await tx.shipment.findUnique({ where: { orderId } });
      if (!current) throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
      if (!canTransitionShipment(current.status, status)) {
        throw new AppError(
          'INVALID_SHIPMENT_TRANSITION',
          `Cannot move shipment from ${current.status} to ${status}`,
          409,
        );
      }
      const s = await tx.shipment.update({
        where: { orderId },
        data: { status, history: { create: { from: current.status, to: status } } },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'shipment.updateStatus',
        entityType: 'order',
        entityId: orderId,
        summary: `Shipment ${current.status} -> ${status}`,
        changes: { from: current.status, to: status },
      });
      return {
        courier: s.courier,
        status: s.status,
        consignmentId: s.consignmentId,
        trackingUrl: s.trackingUrl,
      };
    });
  }
}
