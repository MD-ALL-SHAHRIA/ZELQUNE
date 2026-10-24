import { Injectable } from '@nestjs/common';
import { AppError, OutboxService, recordAudit } from '@zelqune/common';
import { type Coupon, upsertCouponSchema, type UpsertCouponInput } from '@zelqune/contracts';
import { Prisma, type Coupon as CouponRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { COUNTED_STATUSES } from '../reports/report.service';

const SOURCE = 'order-service';

/** Checkout discount codes managed by OWNER/STAFF. Every change is audited. */
@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async list(): Promise<{ items: Coupon[] }> {
    const [rows, usage] = await Promise.all([
      this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.order.groupBy({
        by: ['couponCode'],
        where: { couponCode: { not: null }, status: { in: COUNTED_STATUSES } },
        _count: true,
        _sum: { discountPaisa: true },
      }),
    ]);
    const used = new Map(usage.map((u) => [u.couponCode, u]));
    return {
      items: rows.map((r) => {
        const u = used.get(r.code);
        return this.view(r, u?._count ?? 0, u?._sum.discountPaisa ?? 0);
      }),
    };
  }

  async create(raw: UpsertCouponInput): Promise<Coupon> {
    const input = upsertCouponSchema.parse(raw);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.coupon.create({ data: this.data(input) });
        await recordAudit(this.outbox, tx, SOURCE, {
          action: 'coupon.create',
          entityType: 'coupon',
          entityId: row.id,
          summary: `Coupon ${row.code} created`,
          changes: { ...input },
        });
        return this.view(row, 0, 0);
      });
    } catch (err) {
      throw this.duplicate(err);
    }
  }

  async update(id: string, raw: UpsertCouponInput): Promise<Coupon> {
    const input = upsertCouponSchema.parse(raw);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.coupon.findUnique({ where: { id } });
        if (!before) throw new AppError('COUPON_NOT_FOUND', 'Coupon not found', 404);
        const row = await tx.coupon.update({ where: { id }, data: this.data(input) });
        await recordAudit(this.outbox, tx, SOURCE, {
          action: 'coupon.update',
          entityType: 'coupon',
          entityId: id,
          summary: `Coupon ${row.code} updated`,
          changes: { ...input },
        });
        return this.view(row, 0, 0);
      });
    } catch (err) {
      throw this.duplicate(err);
    }
  }

  /** Deletes an unused coupon; one that was redeemed is deactivated instead (keeps reports). */
  async remove(id: string): Promise<{ deleted: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.coupon.findUnique({ where: { id } });
      if (!row) throw new AppError('COUPON_NOT_FOUND', 'Coupon not found', 404);
      const deleted = row.usedCount === 0;
      if (deleted) await tx.coupon.delete({ where: { id } });
      else await tx.coupon.update({ where: { id }, data: { active: false } });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: deleted ? 'coupon.delete' : 'coupon.deactivate',
        entityType: 'coupon',
        entityId: id,
        summary: `Coupon ${row.code} ${deleted ? 'deleted' : 'deactivated'}`,
      });
      return { deleted };
    });
  }

  private data(input: ReturnType<typeof upsertCouponSchema.parse>) {
    return {
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      maxDiscountPaisa: input.kind === 'PERCENT' ? input.maxDiscountPaisa : null,
    };
  }

  private duplicate(err: unknown): unknown {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      ? new AppError('COUPON_CODE_TAKEN', 'A coupon with this code already exists', 409)
      : err;
  }

  private view(r: CouponRow, ordersCount: number, discountGivenPaisa: number): Coupon {
    return {
      id: r.id,
      code: r.code,
      description: r.description,
      kind: r.kind,
      value: r.value,
      minSubtotalPaisa: r.minSubtotalPaisa,
      maxDiscountPaisa: r.maxDiscountPaisa,
      startsAt: r.startsAt?.toISOString() ?? null,
      endsAt: r.endsAt?.toISOString() ?? null,
      maxUses: r.maxUses,
      usedCount: r.usedCount,
      active: r.active,
      ordersCount,
      discountGivenPaisa,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
