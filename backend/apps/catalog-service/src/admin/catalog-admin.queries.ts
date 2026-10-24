import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  type AdminProduct,
  type AdminProductList,
  type AdminProductListQuery,
  RETAIL_PRICE_LIST,
} from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { toOptions } from '../catalog/catalog.mappers';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.provider';

const productFields = (p: Prisma.ProductGetPayload<{ include: { categories: true } }>) => ({
  id: p.id,
  slug: p.slug,
  nameBn: p.nameBn,
  nameEn: p.nameEn,
  descriptionBn: p.descriptionBn,
  descriptionEn: p.descriptionEn,
  saleMode: p.saleMode,
  leadTimeDays: p.leadTimeDays,
  status: p.status,
  seoTitleBn: p.seoTitleBn,
  seoTitleEn: p.seoTitleEn,
  seoDescriptionBn: p.seoDescriptionBn,
  seoDescriptionEn: p.seoDescriptionEn,
  categoryIds: p.categories.map((c) => c.categoryId),
  publishedAt: p.publishedAt?.toISOString() ?? null,
  updatedAt: p.updatedAt.toISOString(),
});

/** Admin reads: every status, inactive variants and pending media included. */
@Injectable()
export class CatalogAdminQueries {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async listCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { nameEn: 'asc' }],
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        slug: c.slug,
        nameBn: c.nameBn,
        nameEn: c.nameEn,
        position: c.position,
        isActive: c.isActive,
      })),
    };
  }

  async listProducts(query: AdminProductListQuery): Promise<AdminProductList> {
    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { slug: { contains: query.q.toLowerCase() } },
              { nameEn: { contains: query.q, mode: 'insensitive' } },
              { nameBn: { contains: query.q } },
              { variants: { some: { sku: { contains: query.q.toUpperCase() } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { categories: true, _count: { select: { variants: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map((p) => ({ ...productFields(p), variantCount: p._count.variants })),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getProduct(productId: string): Promise<AdminProduct> {
    const now = new Date();
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: true,
        variants: {
          orderBy: [{ position: 'asc' }, { sku: 'asc' }],
          include: {
            prices: {
              where: {
                priceListId: RETAIL_PRICE_LIST,
                startsAt: { lte: now },
                OR: [{ endsAt: null }, { endsAt: { gt: now } }],
              },
              orderBy: { startsAt: 'desc' },
              take: 1,
            },
            experiments: { orderBy: { key: 'asc' } },
          },
        },
        media: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!p) throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    return {
      ...productFields(p),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        options: toOptions(v.options),
        isActive: v.isActive,
        position: v.position,
        weightGrams: v.weightGrams,
        widthMm: v.widthMm,
        heightMm: v.heightMm,
        depthMm: v.depthMm,
        packageLengthMm: v.packageLengthMm,
        packageWidthMm: v.packageWidthMm,
        packageHeightMm: v.packageHeightMm,
        packageWeightGrams: v.packageWeightGrams,
        costPaisa: v.costPaisa,
        basePrice: v.prices[0]
          ? { amountPaisa: v.prices[0].amountPaisa, compareAtPaisa: v.prices[0].compareAtPaisa }
          : null,
        experiments: v.experiments.map((e) => ({
          key: e.key,
          amountPaisa: e.amountPaisa,
          active: e.active,
        })),
      })),
      media: p.media.map((m) => ({
        id: m.id,
        url: this.storage.publicUrl(m.storageKey),
        mimeType: m.mimeType,
        altBn: m.altBn,
        altEn: m.altEn,
        position: m.position,
        variantId: m.variantId,
        status: m.status,
        bytes: m.bytes,
      })),
    };
  }
}
