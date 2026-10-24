import { Injectable } from '@nestjs/common';
import { AppError, OutboxService, recordAudit } from '@zelqune/common';
import {
  type Promotion,
  upsertPromotionSchema,
  type UpsertPromotionInput,
} from '@zelqune/contracts';
import { type Promotion as PromotionRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SOURCE = 'catalog-service';

export function promotionState(
  p: Pick<PromotionRow, 'active' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): Promotion['state'] {
  if (p.endsAt <= now) return 'ENDED';
  if (!p.active) return 'PAUSED';
  return p.startsAt > now ? 'SCHEDULED' : 'LIVE';
}

/** Flash and seasonal sales (ADR 0016). Prices change the moment a sale starts or ends. */
@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async list(): Promise<{ items: Promotion[] }> {
    const rows = await this.prisma.promotion.findMany({
      include: { products: { select: { productId: true } } },
      orderBy: [{ startsAt: 'desc' }],
    });
    const now = new Date();
    return { items: rows.map((r) => this.view(r, now)) };
  }

  async create(raw: UpsertPromotionInput): Promise<Promotion> {
    const input = upsertPromotionSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      await this.checkProducts(tx, input.productIds);
      const row = await tx.promotion.create({
        data: {
          ...this.fields(input),
          products: { createMany: { data: input.productIds.map((productId) => ({ productId })) } },
        },
        include: { products: { select: { productId: true } } },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'promotion.create',
        entityType: 'promotion',
        entityId: row.id,
        summary: `Sale "${row.nameEn}" created (${this.describe(row)})`,
        changes: { ...input },
      });
      return this.view(row, new Date());
    });
  }

  async update(id: string, raw: UpsertPromotionInput): Promise<Promotion> {
    const input = upsertPromotionSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.promotion.findUnique({ where: { id } });
      if (!before) throw new AppError('PROMOTION_NOT_FOUND', 'Sale not found', 404);
      await this.checkProducts(tx, input.productIds);
      await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
      const row = await tx.promotion.update({
        where: { id },
        data: {
          ...this.fields(input),
          products: { createMany: { data: input.productIds.map((productId) => ({ productId })) } },
        },
        include: { products: { select: { productId: true } } },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'promotion.update',
        entityType: 'promotion',
        entityId: id,
        summary: `Sale "${row.nameEn}" updated (${this.describe(row)})`,
        changes: { ...input },
      });
      return this.view(row, new Date());
    });
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.promotion.findUnique({ where: { id } });
      if (!row) throw new AppError('PROMOTION_NOT_FOUND', 'Sale not found', 404);
      await tx.promotion.delete({ where: { id } });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'promotion.delete',
        entityType: 'promotion',
        entityId: id,
        summary: `Sale "${row.nameEn}" deleted`,
      });
      return { deleted: true };
    });
  }

  /** Unit cost per variant (null when not set), for profit and loss. */
  async variantCosts(variantIds: string[]): Promise<Record<string, number | null>> {
    const rows = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, costPaisa: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.costPaisa]));
    return Object.fromEntries(variantIds.map((id) => [id, byId.get(id) ?? null]));
  }

  private async checkProducts(
    tx: Pick<PrismaService, 'product'>,
    productIds: string[],
  ): Promise<void> {
    if (!productIds.length) return;
    const found = await tx.product.count({ where: { id: { in: productIds } } });
    if (found !== new Set(productIds).size)
      throw new AppError('PRODUCT_NOT_FOUND', 'One of the products does not exist', 422);
  }

  private fields(input: ReturnType<typeof upsertPromotionSchema.parse>) {
    return {
      nameEn: input.nameEn,
      nameBn: input.nameBn,
      kind: input.kind,
      value: input.value,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      flash: input.flash,
      active: input.active,
    };
  }

  private describe(r: Pick<PromotionRow, 'kind' | 'value'>): string {
    return r.kind === 'PERCENT' ? `${r.value}% off` : `৳${r.value / 100} off`;
  }

  private view(r: PromotionRow & { products: { productId: string }[] }, now: Date): Promotion {
    return {
      id: r.id,
      nameEn: r.nameEn,
      nameBn: r.nameBn,
      kind: r.kind,
      value: r.value,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      flash: r.flash,
      active: r.active,
      productIds: r.products.map((p) => p.productId),
      state: promotionState(r, now),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
