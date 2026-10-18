import { Inject, Injectable } from '@nestjs/common';
import { AppError, OutboxService, requestContext, type SqlExecutor } from '@zelqune/common';
import {
  confirmMediaUploadInputSchema,
  createCategoryInputSchema,
  createProductInputSchema,
  type CreateCategoryInput,
  type CreateProductInput,
  type EventDefinition,
  type MediaUploadTicket,
  priceChanged,
  productIdInputSchema,
  productPublished,
  productUpdated,
  requestMediaUploadInputSchema,
  type RequestMediaUploadInput,
  setBasePriceInputSchema,
  type SetBasePriceInput,
  setExperimentPriceInputSchema,
  type SetExperimentPriceInput,
  updateProductInputSchema,
  type UpdateProductInput,
  upsertVariantInputSchema,
  type UpsertVariantInput,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type z } from 'zod';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.provider';
import { changedFields } from './changed-fields';

const SOURCE = 'catalog-service';
const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
};

type Tx = Prisma.TransactionClient;

/**
 * Catalog write use-cases (admin). Every change that other services care about writes its
 * event to the outbox in the same transaction. Exposed over TCP; gateway routes in step 1.3.
 */
@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async createCategory(raw: CreateCategoryInput): Promise<{ id: string }> {
    const input = createCategoryInputSchema.parse(raw);
    if (input.parentId)
      await this.mustExist(
        this.prisma.category.findUnique({ where: { id: input.parentId } }),
        'CATEGORY_NOT_FOUND',
      );
    return this.prisma.category.create({ data: input, select: { id: true } });
  }

  async createProduct(raw: CreateProductInput): Promise<{ id: string; slug: string }> {
    const { categoryIds, ...fields } = createProductInputSchema.parse(raw);
    return this.prisma.product.create({
      data: {
        ...fields,
        status: 'DRAFT',
        categories: {
          create: categoryIds.map((categoryId, position) => ({ categoryId, position })),
        },
      },
      select: { id: true, slug: true },
    });
  }

  async updateProduct(raw: UpdateProductInput): Promise<{ id: string; changedFields: string[] }> {
    const { productId, changes } = updateProductInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.lockProduct(tx, productId);
      const currentCategoryIds = (await tx.productCategory.findMany({ where: { productId } })).map(
        (c) => c.categoryId,
      );
      const { categoryIds, ...fields } = changes;
      const changed = changedFields(
        { ...current, categoryIds: currentCategoryIds },
        { ...fields, categoryIds },
      );
      if (changed.length === 0) return { id: productId, changedFields: [] };

      const updated = await tx.product.update({ where: { id: productId }, data: fields });
      if (categoryIds && changed.includes('categoryIds')) {
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId, position) => ({ productId, categoryId, position })),
        });
      }
      await this.emit(tx, productUpdated, {
        productId,
        slug: updated.slug,
        status: updated.status,
        changedFields: changed,
      });
      return { id: productId, changedFields: changed };
    });
  }

  /** DRAFT/ARCHIVED -> ACTIVE. Needs at least one active, priced variant. Idempotent. */
  async publishProduct(raw: { productId: string }): Promise<{ id: string; status: 'ACTIVE' }> {
    const { productId } = productIdInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      if (product.status === 'ACTIVE') return { id: productId, status: 'ACTIVE' as const };

      const sellable = await tx.productVariant.count({
        where: {
          productId,
          isActive: true,
          OR: [{ prices: { some: { endsAt: null } } }, { experiments: { some: { active: true } } }],
        },
      });
      if (sellable === 0) {
        throw new AppError(
          'PRODUCT_NOT_PUBLISHABLE',
          'Product needs at least one active variant with a price',
          409,
        );
      }
      const publishedAt = product.publishedAt ?? new Date();
      await tx.product.update({
        where: { id: productId },
        data: { status: 'ACTIVE', publishedAt },
      });
      await this.emit(tx, productPublished, {
        productId,
        slug: product.slug,
        saleMode: product.saleMode,
        publishedAt: publishedAt.toISOString(),
      });
      return { id: productId, status: 'ACTIVE' as const };
    });
  }

  /** Creates or updates a variant by SKU. A SKU can never move to another product. */
  async upsertVariant(raw: UpsertVariantInput): Promise<{ id: string; created: boolean }> {
    const { productId, sku, ...fields } = upsertVariantInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      const existing = await tx.productVariant.findUnique({ where: { sku } });
      if (existing && existing.productId !== productId) {
        throw new AppError('SKU_TAKEN', `SKU ${sku} belongs to another product`, 409);
      }
      const variant = existing
        ? await tx.productVariant.update({ where: { id: existing.id }, data: fields })
        : await tx.productVariant.create({ data: { productId, sku, ...fields } });
      if (product.status === 'ACTIVE') {
        await this.emit(tx, productUpdated, {
          productId,
          slug: product.slug,
          status: product.status,
          changedFields: ['variants'],
        });
      }
      return { id: variant.id, created: !existing };
    });
  }

  /** Replaces the current base price (history kept: old row gets endsAt). No-op if unchanged. */
  async setBasePrice(raw: SetBasePriceInput): Promise<{ changed: boolean }> {
    const input = setBasePriceInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const variant = await this.lockVariant(tx, input.variantId);
      const now = new Date();
      const current = await tx.price.findFirst({
        where: {
          variantId: variant.id,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: { startsAt: 'desc' },
      });
      if (
        current &&
        current.amountPaisa === input.amountPaisa &&
        current.compareAtPaisa === input.compareAtPaisa
      ) {
        return { changed: false };
      }
      await tx.price.updateMany({
        where: { variantId: variant.id, endsAt: null },
        data: { endsAt: now },
      });
      await tx.price.create({
        data: {
          variantId: variant.id,
          amountPaisa: input.amountPaisa,
          compareAtPaisa: input.compareAtPaisa,
          startsAt: now,
        },
      });
      await this.emit(tx, priceChanged, {
        productId: variant.productId,
        variantId: variant.id,
        amountPaisa: input.amountPaisa,
        compareAtPaisa: input.compareAtPaisa,
        previousAmountPaisa: current?.amountPaisa ?? null,
        experimentKey: null,
      });
      return { changed: true };
    });
  }

  async setExperimentPrice(raw: SetExperimentPriceInput): Promise<{ changed: boolean }> {
    const input = setExperimentPriceInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const variant = await this.lockVariant(tx, input.variantId);
      const where = { variantId_key: { variantId: variant.id, key: input.key } };
      const existing = await tx.priceExperiment.findUnique({ where });
      if (
        existing &&
        existing.amountPaisa === input.amountPaisa &&
        existing.active === input.active
      ) {
        return { changed: false };
      }
      await tx.priceExperiment.upsert({
        where,
        create: {
          variantId: variant.id,
          key: input.key,
          amountPaisa: input.amountPaisa,
          active: input.active,
        },
        update: { amountPaisa: input.amountPaisa, active: input.active },
      });
      await this.emit(tx, priceChanged, {
        productId: variant.productId,
        variantId: variant.id,
        amountPaisa: input.amountPaisa,
        compareAtPaisa: null,
        previousAmountPaisa: existing?.amountPaisa ?? null,
        experimentKey: input.key,
      });
      return { changed: true };
    });
  }

  /** Creates a PENDING media row and a presigned upload URL; confirm after the PUT. */
  async requestMediaUpload(raw: RequestMediaUploadInput): Promise<MediaUploadTicket> {
    const input = requestMediaUploadInputSchema.parse(raw);
    await this.mustExist(
      this.prisma.product.findUnique({ where: { id: input.productId } }),
      'PRODUCT_NOT_FOUND',
    );
    if (input.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: input.variantId },
      });
      if (!variant || variant.productId !== input.productId) {
        throw new AppError('VARIANT_NOT_FOUND', 'Variant not found on this product', 404);
      }
    }
    const id = randomUUID();
    const storageKey = `media/${id}.${EXTENSIONS[input.mimeType]}`;
    await this.prisma.media.create({ data: { id, ...input, storageKey, status: 'PENDING' } });
    const target = await this.storage.createUploadUrl({
      key: storageKey,
      contentType: input.mimeType,
      bytes: input.bytes,
    });
    return {
      mediaId: id,
      uploadUrl: target.url,
      method: target.method,
      headers: target.headers,
      expiresAt: target.expiresAt.toISOString(),
    };
  }

  /** Verifies the uploaded object (exists, size, type) and marks the media READY. */
  async confirmMediaUpload(raw: { mediaId: string }): Promise<{ id: string; status: 'READY' }> {
    const { mediaId } = confirmMediaUploadInputSchema.parse(raw);
    const media = await this.mustExist(
      this.prisma.media.findUnique({ where: { id: mediaId } }),
      'MEDIA_NOT_FOUND',
    );
    if (media.status === 'READY') return { id: mediaId, status: 'READY' };

    const object = await this.storage.head(media.storageKey);
    if (!object || object.bytes !== media.bytes || object.contentType !== media.mimeType) {
      throw new AppError('MEDIA_NOT_UPLOADED', 'Upload missing or does not match the request', 409);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.media.update({ where: { id: mediaId }, data: { status: 'READY' } });
      const product = await this.lockProduct(tx, media.productId);
      if (product.status === 'ACTIVE') {
        await this.emit(tx, productUpdated, {
          productId: product.id,
          slug: product.slug,
          status: product.status,
          changedFields: ['media'],
        });
      }
      return { id: mediaId, status: 'READY' as const };
    });
  }

  private async emit<TSchema extends z.ZodType>(
    tx: SqlExecutor,
    event: EventDefinition<string, TSchema>,
    payload: z.input<TSchema>,
  ): Promise<void> {
    await this.outbox.add(
      tx,
      event.create(payload, { source: SOURCE, requestId: requestContext.requestId() }),
    );
  }

  /** Row-locks the product for the rest of the transaction (serialises concurrent admin edits). */
  private async lockProduct(tx: Tx, productId: string) {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
    return this.mustExist(tx.product.findUnique({ where: { id: productId } }), 'PRODUCT_NOT_FOUND');
  }

  private async lockVariant(tx: Tx, variantId: string) {
    await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variantId}::uuid FOR UPDATE`;
    return this.mustExist(
      tx.productVariant.findUnique({ where: { id: variantId } }),
      'VARIANT_NOT_FOUND',
    );
  }

  private async mustExist<T>(promise: Promise<T | null>, code: string): Promise<T> {
    const value = await promise;
    if (!value) throw new AppError(code, code.replace(/_/g, ' ').toLowerCase(), 404);
    return value;
  }
}
