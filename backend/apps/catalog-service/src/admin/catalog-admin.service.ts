import { Inject, Injectable } from '@nestjs/common';
import {
  type AuditEntry,
  AppError,
  OutboxService,
  recordAudit,
  requestContext,
  type SqlExecutor,
} from '@zelqune/common';
import {
  confirmMediaUploadInputSchema,
  createCategoryInputSchema,
  createProductInputSchema,
  type CreateCategoryInput,
  type CreateProductInput,
  type EventDefinition,
  mediaIdInputSchema,
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
  updateCategoryInputSchema,
  type UpdateCategoryInput,
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
import { changedFields, sameOptions } from './changed-fields';

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
 * event to the outbox in the same transaction, and every change is audited (audit.recorded).
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
    return this.prisma.$transaction(async (tx) => {
      if (input.parentId)
        await this.mustExist(
          tx.category.findUnique({ where: { id: input.parentId } }),
          'CATEGORY_NOT_FOUND',
        );
      const category = await tx.category.create({ data: input, select: { id: true } });
      await this.audit(tx, {
        action: 'category.create',
        entityType: 'category',
        entityId: category.id,
        summary: `Category ${input.slug} created`,
        changes: { ...input },
      });
      return category;
    });
  }

  async updateCategory(raw: UpdateCategoryInput): Promise<{ id: string; changedFields: string[] }> {
    const { categoryId, changes } = updateCategoryInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.mustExist(
        tx.category.findUnique({ where: { id: categoryId } }),
        'CATEGORY_NOT_FOUND',
      );
      if (changes.parentId === categoryId) {
        throw new AppError('INVALID_CATEGORY_PARENT', 'A category cannot be its own parent', 422);
      }
      const changed = changedFields(current, changes);
      if (changed.length === 0) return { id: categoryId, changedFields: [] };
      await tx.category.update({ where: { id: categoryId }, data: changes });
      await this.audit(tx, {
        action: 'category.update',
        entityType: 'category',
        entityId: categoryId,
        summary: `Category ${current.slug} updated: ${changed.join(', ')}`,
        changes: Object.fromEntries(
          changed.map((k) => [k, (changes as Record<string, unknown>)[k]]),
        ),
      });
      return { id: categoryId, changedFields: changed };
    });
  }

  async createProduct(raw: CreateProductInput): Promise<{ id: string; slug: string }> {
    const { categoryIds, ...fields } = createProductInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...fields,
          status: 'DRAFT',
          categories: {
            create: categoryIds.map((categoryId, position) => ({ categoryId, position })),
          },
        },
        select: { id: true, slug: true },
      });
      await this.audit(tx, {
        action: 'product.create',
        entityType: 'product',
        entityId: product.id,
        summary: `Product ${product.slug} created (DRAFT)`,
        changes: { slug: fields.slug, saleMode: fields.saleMode },
      });
      return product;
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
      await this.audit(tx, {
        action: 'product.update',
        entityType: 'product',
        entityId: productId,
        summary: `Product ${updated.slug} updated: ${changed.join(', ')}`,
        changes: Object.fromEntries(
          changed.map((k) => [k, (changes as Record<string, unknown>)[k]]),
        ),
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
      await this.audit(tx, {
        action: 'product.publish',
        entityType: 'product',
        entityId: productId,
        summary: `Product ${product.slug} published`,
        changes: { from: product.status, to: 'ACTIVE' },
      });
      return { id: productId, status: 'ACTIVE' as const };
    });
  }

  /** ACTIVE/DRAFT -> ARCHIVED: hidden from the storefront, kept for order history. Idempotent. */
  async archiveProduct(raw: { productId: string }): Promise<{ id: string; status: 'ARCHIVED' }> {
    const { productId } = productIdInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      if (product.status === 'ARCHIVED') return { id: productId, status: 'ARCHIVED' as const };
      await tx.product.update({ where: { id: productId }, data: { status: 'ARCHIVED' } });
      await this.emit(tx, productUpdated, {
        productId,
        slug: product.slug,
        status: 'ARCHIVED',
        changedFields: ['status'],
      });
      await this.audit(tx, {
        action: 'product.archive',
        entityType: 'product',
        entityId: productId,
        summary: `Product ${product.slug} archived`,
        changes: { from: product.status, to: 'ARCHIVED' },
      });
      return { id: productId, status: 'ARCHIVED' as const };
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
      let changed: string[] = Object.keys(fields);
      if (existing) {
        const { options, ...scalars } = fields;
        changed = [
          ...changedFields(existing, scalars),
          ...(sameOptions(existing.options, options) ? [] : ['options']),
        ];
        if (changed.length === 0) return { id: existing.id, created: false };
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
      await this.audit(tx, {
        action: existing ? 'variant.update' : 'variant.create',
        entityType: 'variant',
        entityId: variant.id,
        summary: `${sku} ${existing ? `updated: ${changed.join(', ')}` : 'created'}`,
        changes: Object.fromEntries(
          changed.map((k) => [k, (fields as Record<string, unknown>)[k]]),
        ),
      });
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
          priceListId: input.priceListId,
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
        where: { variantId: variant.id, priceListId: input.priceListId, endsAt: null },
        data: { endsAt: now },
      });
      await tx.price.create({
        data: {
          variantId: variant.id,
          priceListId: input.priceListId,
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
      await this.audit(tx, {
        action: 'price.setBase',
        entityType: 'variant',
        entityId: variant.id,
        summary: `${variant.sku} ${input.priceListId} price ${current?.amountPaisa ?? '-'} -> ${input.amountPaisa} paisa`,
        changes: {
          priceListId: input.priceListId,
          from: current?.amountPaisa ?? null,
          to: input.amountPaisa,
          compareAtPaisa: input.compareAtPaisa,
        },
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
      await this.audit(tx, {
        action: 'price.setExperiment',
        entityType: 'variant',
        entityId: variant.id,
        summary: `${variant.sku} experiment ${input.key}: ${existing?.amountPaisa ?? '-'} -> ${input.amountPaisa} paisa${input.active ? '' : ' (inactive)'}`,
        changes: {
          key: input.key,
          from: existing?.amountPaisa ?? null,
          to: input.amountPaisa,
          active: input.active,
        },
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
    await this.prisma.$transaction(async (tx) => {
      await tx.media.create({ data: { id, ...input, storageKey, status: 'PENDING' } });
      await this.audit(tx, {
        action: 'media.requestUpload',
        entityType: 'media',
        entityId: id,
        summary: `Upload requested for product ${input.productId} (${input.mimeType}, ${input.bytes} bytes)`,
        changes: {
          productId: input.productId,
          variantId: input.variantId,
          mimeType: input.mimeType,
        },
      });
    });
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
      await this.audit(tx, {
        action: 'media.confirm',
        entityType: 'media',
        entityId: mediaId,
        summary: `Media ready on ${product.slug}`,
        changes: null,
      });
      return { id: mediaId, status: 'READY' as const };
    });
  }

  /** Removes a media item from the product (the stored object is cleaned up separately). */
  async removeMedia(raw: { mediaId: string }): Promise<{ removed: boolean }> {
    const { mediaId } = mediaIdInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const media = await tx.media.findUnique({ where: { id: mediaId } });
      if (!media) return { removed: false };
      const product = await this.lockProduct(tx, media.productId);
      await tx.media.delete({ where: { id: mediaId } });
      if (product.status === 'ACTIVE' && media.status === 'READY') {
        await this.emit(tx, productUpdated, {
          productId: product.id,
          slug: product.slug,
          status: product.status,
          changedFields: ['media'],
        });
      }
      await this.audit(tx, {
        action: 'media.remove',
        entityType: 'media',
        entityId: mediaId,
        summary: `Media removed from ${product.slug}`,
        changes: { storageKey: media.storageKey },
      });
      return { removed: true };
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

  private audit(tx: SqlExecutor, entry: AuditEntry): Promise<void> {
    return recordAudit(this.outbox, tx, SOURCE, entry);
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
