import { Inject, Injectable } from '@nestjs/common';
import {
  type AuditEntry,
  AppError,
  OutboxService,
  recordAudit,
  type SqlExecutor,
} from '@zelqune/common';
import {
  type ContentAsset,
  contentAssetIdInputSchema,
  type ContentAssetTicket,
  type HomeContent,
  type HomeContentResponse,
  homeContentSchema,
  requestContentAssetUploadInputSchema,
  type RequestContentAssetUploadInput,
  updateHomeContentInputSchema,
  type UpdateHomeContentInput,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.provider';

const SOURCE = 'catalog-service';
const HOME = 'home';
const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
};

/** Every asset id a home document points at. */
export function referencedAssets(content: HomeContent): string[] {
  const ids = [
    ...content.hero.scenes.map((s) => s.assetId),
    ...content.collections.map((c) => c.assetId),
  ];
  return [...new Set(ids.filter((id): id is string => id !== null))];
}

/**
 * Storefront content (ADR 0015): one versioned document per key, written by OWNER/STAFF with
 * optimistic concurrency and audited; images are content assets uploaded like product media
 * (presigned PUT, then a verified confirm). Readers only ever see READY assets.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** The home document with asset URLs resolved, or `null` before the first save. */
  async home(): Promise<HomeContentResponse> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: HOME } });
    if (!row) return { home: null };
    const content = homeContentSchema.parse(row.data);
    const ids = referencedAssets(content);
    const assets = ids.length
      ? await this.prisma.contentAsset.findMany({ where: { id: { in: ids }, status: 'READY' } })
      : [];
    const urls = new Map(assets.map((a) => [a.id, this.storage.publicUrl(a.storageKey)]));
    const url = (id: string | null) => (id ? (urls.get(id) ?? null) : null);
    return {
      home: {
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
        content: {
          ...content,
          hero: {
            ...content.hero,
            scenes: content.hero.scenes.map((s) => ({ ...s, imageUrl: url(s.assetId) })),
          },
          collections: content.collections.map((c) => ({ ...c, imageUrl: url(c.assetId) })),
        },
      },
    };
  }

  /** Saves the home document if nobody saved in between (`expectedVersion`). */
  async updateHome(raw: UpdateHomeContentInput): Promise<{ version: number; updatedAt: string }> {
    const { expectedVersion, content } = updateHomeContentInputSchema.parse(raw);
    const ids = referencedAssets(content);
    if (ids.length) {
      const ready = await this.prisma.contentAsset.count({
        where: { id: { in: ids }, status: 'READY' },
      });
      if (ready !== ids.length) {
        throw new AppError('CONTENT_ASSET_NOT_READY', 'An image is missing or not uploaded', 422);
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.siteContent.findUnique({ where: { key: HOME } });
      if ((current?.version ?? 0) !== expectedVersion) {
        throw new AppError(
          'CONTENT_VERSION_CONFLICT',
          'The content was changed by someone else; reload and try again',
          409,
        );
      }
      const version = expectedVersion + 1;
      const data = content as unknown as Prisma.InputJsonValue;
      const row = current
        ? await tx.siteContent.update({ where: { key: HOME }, data: { version, data } })
        : await tx.siteContent.create({ data: { key: HOME, version, data } });
      await this.audit(tx, {
        action: 'content.update',
        entityType: 'content',
        entityId: HOME,
        summary: `Home content saved (version ${version})`,
        changes: { version },
      });
      return { version: row.version, updatedAt: row.updatedAt.toISOString() };
    });
  }

  async requestAssetUpload(raw: RequestContentAssetUploadInput): Promise<ContentAssetTicket> {
    const input = requestContentAssetUploadInputSchema.parse(raw);
    const id = randomUUID();
    const storageKey = `content/${id}.${EXTENSIONS[input.mimeType]}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.contentAsset.create({ data: { id, ...input, storageKey, status: 'PENDING' } });
      await this.audit(tx, {
        action: 'contentAsset.requestUpload',
        entityType: 'contentAsset',
        entityId: id,
        summary: `Content image upload requested (${input.mimeType}, ${input.bytes} bytes)`,
        changes: { mimeType: input.mimeType },
      });
    });
    const target = await this.storage.createUploadUrl({
      key: storageKey,
      contentType: input.mimeType,
      bytes: input.bytes,
    });
    return {
      assetId: id,
      uploadUrl: target.url,
      method: target.method,
      headers: target.headers,
      expiresAt: target.expiresAt.toISOString(),
    };
  }

  /** Verifies the uploaded object (exists, size, type) and marks the asset READY. */
  async confirmAssetUpload(raw: { assetId: string }): Promise<ContentAsset> {
    const { assetId } = contentAssetIdInputSchema.parse(raw);
    const asset = await this.prisma.contentAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError('CONTENT_ASSET_NOT_FOUND', 'Image not found', 404);
    const url = this.storage.publicUrl(asset.storageKey);
    if (asset.status === 'READY') return { id: assetId, url, status: 'READY' };

    const object = await this.storage.head(asset.storageKey);
    if (!object || object.bytes !== asset.bytes || object.contentType !== asset.mimeType) {
      throw new AppError('MEDIA_NOT_UPLOADED', 'Upload missing or does not match the request', 409);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.contentAsset.update({ where: { id: assetId }, data: { status: 'READY' } });
      await this.audit(tx, {
        action: 'contentAsset.confirm',
        entityType: 'contentAsset',
        entityId: assetId,
        summary: 'Content image ready',
        changes: null,
      });
    });
    return { id: assetId, url, status: 'READY' };
  }

  private audit(tx: SqlExecutor, entry: AuditEntry): Promise<void> {
    return recordAudit(this.outbox, tx, SOURCE, entry);
  }
}
