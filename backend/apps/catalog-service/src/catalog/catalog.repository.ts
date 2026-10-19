import { Injectable } from '@nestjs/common';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** What public views load: ACTIVE products, active variants with current prices, READY media. */
export function publicProductInclude(now: Date) {
  return {
    variants: {
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { sku: 'asc' }],
      include: {
        prices: {
          where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        },
        experiments: { where: { active: true } },
      },
    },
    media: { where: { status: 'READY' }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
    categories: { include: { category: true }, orderBy: { position: 'asc' } },
  } satisfies Prisma.ProductInclude;
}

export type PublicProductRow = Prisma.ProductGetPayload<{
  include: ReturnType<typeof publicProductInclude>;
}>;

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
    });
  }

  async listPublicProducts(params: {
    categorySlug?: string;
    saleMode?: Prisma.ProductWhereInput['saleMode'];
    skip: number;
    take: number;
    now: Date;
  }): Promise<{ rows: PublicProductRow[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(params.saleMode ? { saleMode: params.saleMode } : {}),
      ...(params.categorySlug
        ? { categories: { some: { category: { slug: params.categorySlug, isActive: true } } } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: publicProductInclude(params.now),
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { rows, total };
  }

  findPublicProductBySlug(slug: string, now: Date): Promise<PublicProductRow | null> {
    return this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: publicProductInclude(now),
    });
  }

  /** Variants for price resolution (order-service), only sellable ones. */
  findSellableVariants(variantIds: string[], now: Date) {
    return this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true, product: { status: 'ACTIVE' } },
      include: publicProductInclude(now).variants.include,
    });
  }

  /** Sellable variants with their product, for order-service checkout snapshots. */
  findCheckoutVariants(variantIds: string[], now: Date) {
    return this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true, product: { status: 'ACTIVE' } },
      include: { ...publicProductInclude(now).variants.include, product: true },
    });
  }
}
