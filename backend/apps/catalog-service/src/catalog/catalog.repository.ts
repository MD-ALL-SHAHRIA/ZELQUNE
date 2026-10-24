import { RETAIL_PRICE_LIST } from '@zelqune/contracts';
import { Injectable } from '@nestjs/common';
import { type Prisma } from '../generated/prisma/client';
import { type LiveSale } from '../pricing/price-resolution';
import { PrismaService } from '../prisma/prisma.service';

/** What public views load: ACTIVE products, active variants with current prices, READY media. */
export function publicProductInclude(now: Date) {
  return {
    variants: {
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { sku: 'asc' }],
      include: {
        prices: {
          // Storefront prices are always the RETAIL list (wholesale lists arrive in M2).
          where: {
            priceListId: RETAIL_PRICE_LIST,
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
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

  /** Promotions running at `now`, soonest-ending first. */
  async liveSales(now: Date): Promise<LiveSale[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
      include: { products: { select: { productId: true } } },
      orderBy: { endsAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      nameEn: r.nameEn,
      nameBn: r.nameBn,
      kind: r.kind,
      value: r.value,
      endsAt: r.endsAt,
      flash: r.flash,
      productIds: r.products.length ? new Set(r.products.map((p) => p.productId)) : null,
    }));
  }

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
