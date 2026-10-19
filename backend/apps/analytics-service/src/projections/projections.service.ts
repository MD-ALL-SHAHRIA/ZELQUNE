import { Injectable } from '@nestjs/common';
import {
  auditRecorded,
  type BeaconEvent,
  beaconEventSchema,
  customerFriendFlagChanged,
  type EventEnvelope,
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  orderStatusChanged,
  paymentVerified,
} from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const bucket = (p?: string | null): 'a' | 'b' | null => {
  const v = p?.trim().toLowerCase();
  return v === 'a' || v === 'b' ? v : null;
};

/**
 * Builds analytics read models from events. Every write is an upsert or guarded by a timestamp,
 * so events arriving out of order (parallel consumers, retries) converge to the same state.
 * PII rule (ADR 0010): order.placed's `customer` is ignored; only `customerKey` is kept.
 */
@Injectable()
export class ProjectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Storefront beacon (VIEW / ADD_TO_CART). */
  async track(raw: BeaconEvent): Promise<{ ok: true }> {
    const e = beaconEventSchema.parse(raw);
    await this.prisma.trackedEvent.create({
      data: {
        type: e.type,
        sessionId: e.sessionId,
        productId: e.productId,
        variantId: e.variantId,
        experimentKey: bucket(e.p),
        path: e.path,
        utmSource: e.utm?.source,
        utmMedium: e.utm?.medium,
        utmCampaign: e.utm?.campaign,
        utmContent: e.utm?.content,
        utmTerm: e.utm?.term,
      },
    });
    return { ok: true };
  }

  async onOrderPlaced(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderPlaced.parse(event).payload;
    const placedAt = new Date(event.occurredAt);
    const fact = {
      code: p.code,
      channel: p.channel,
      saleMode: p.saleMode,
      customerKey: p.customerKey ?? null,
      totalPaisa: p.totalPaisa,
      advanceRequiredPaisa: p.advanceRequiredPaisa,
      experimentKey: p.experimentKey,
      sessionId: p.sessionId ?? null,
      utmSource: p.utm?.source ?? null,
      utmCampaign: p.utm?.campaign ?? null,
      placedAt,
    };
    await tx.orderFact.upsert({
      where: { orderId: p.orderId },
      create: { orderId: p.orderId, ...fact },
      update: fact,
    });
    await tx.trackedEvent.upsert({
      where: { orderId_type: { orderId: p.orderId, type: 'CHECKOUT' } },
      create: {
        type: 'CHECKOUT',
        orderId: p.orderId,
        sessionId: p.sessionId,
        experimentKey: p.experimentKey,
        channel: p.channel,
        utmSource: p.utm?.source,
        utmMedium: p.utm?.medium,
        utmCampaign: p.utm?.campaign,
        utmContent: p.utm?.content,
        utmTerm: p.utm?.term,
        occurredAt: placedAt,
      },
      update: {},
    });
  }

  async onOrderConfirmed(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderConfirmed.parse(event).payload;
    const confirmedAt = new Date(p.confirmedAt);
    const fact = await tx.orderFact.upsert({
      where: { orderId: p.orderId },
      create: { orderId: p.orderId, code: p.code, confirmedAt },
      update: { confirmedAt },
    });
    await tx.trackedEvent.upsert({
      where: { orderId_type: { orderId: p.orderId, type: 'PURCHASE' } },
      create: {
        type: 'PURCHASE',
        orderId: p.orderId,
        sessionId: fact.sessionId,
        experimentKey: fact.experimentKey,
        channel: fact.channel,
        utmSource: fact.utmSource,
        utmCampaign: fact.utmCampaign,
        occurredAt: confirmedAt,
      },
      update: {},
    });
  }

  /** Applies the status only if this change is newer than the last one seen. */
  async onOrderStatusChanged(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderStatusChanged.parse(event).payload;
    const changedAt = new Date(p.changedAt);
    await tx.orderFact.upsert({
      where: { orderId: p.orderId },
      create: {
        orderId: p.orderId,
        code: p.code,
        channel: p.channel,
        status: p.to,
        statusChangedAt: changedAt,
      },
      update: {},
    });
    await tx.orderFact.updateMany({
      where: {
        orderId: p.orderId,
        OR: [{ statusChangedAt: null }, { statusChangedAt: { lte: changedAt } }],
      },
      data: { status: p.to, statusChangedAt: changedAt },
    });
  }

  async onOrderCancelled(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderCancelled.parse(event).payload;
    const cancelledAt = new Date(p.cancelledAt);
    await tx.orderFact.upsert({
      where: { orderId: p.orderId },
      create: { orderId: p.orderId, code: p.code, cancelledAt },
      update: { cancelledAt },
    });
  }

  /** Only verified ADVANCE payments make an order count for GO (COD never does). */
  async onPaymentVerified(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = paymentVerified.parse(event).payload;
    if (p.kind !== 'ADVANCE' || p.amountPaisa <= 0) return;
    await tx.orderFact.upsert({
      where: { orderId: p.orderId },
      create: { orderId: p.orderId, code: p.orderCode, advanceVerifiedPaisa: p.amountPaisa },
      update: { advanceVerifiedPaisa: { increment: p.amountPaisa } },
    });
  }

  async onFriendFlagChanged(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = customerFriendFlagChanged.parse(event).payload;
    const changedAt = new Date(p.changedAt);
    const current = await tx.customerFlag.findUnique({ where: { customerKey: p.customerKey } });
    if (current && current.changedAt > changedAt) return;
    await tx.customerFlag.upsert({
      where: { customerKey: p.customerKey },
      create: { customerKey: p.customerKey, isFriend: p.isFriend, changedAt },
      update: { isFriend: p.isFriend, changedAt },
    });
  }

  async onAuditRecorded(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = auditRecorded.parse(event).payload;
    await tx.auditLog.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        occurredAt: new Date(event.occurredAt),
        source: event.source,
        actorId: p.actor.id,
        actorRole: p.actor.role,
        action: p.action,
        entityType: p.entityType,
        entityId: p.entityId,
        summary: p.summary,
        changes: (p.changes ?? undefined) as Prisma.InputJsonValue | undefined,
        requestId: event.requestId ?? null,
      },
      update: {},
    });
  }
}
