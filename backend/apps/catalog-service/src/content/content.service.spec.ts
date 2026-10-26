import { type EventEnvelope, homeContentSchema, type HomeContentInput } from '@zelqune/contracts';
import { type OutboxService } from '@zelqune/common';
import { type PrismaService } from '../prisma/prisma.service';
import { type StorageProvider } from '../storage/storage.provider';
import { ContentService, referencedAssets } from './content.service';

const assetA = '3e9a3d6b-0c5d-4f68-9d8b-5c4a3f4e5d6b';
const assetB = '4fab4e7c-1d6e-4a79-8e9c-6d5b4a5f6e7c';

const localized = (en: string) => ({ en, bn: en });
const draft = (sceneAsset: string | null = null): HomeContentInput => ({
  announcement: localized('Pre-orders are open'),
  hero: {
    eyebrow: localized('Sculptural wall decor'),
    heading: localized('Handcrafted wood and gentle light'),
    accent: localized('quiet story.'),
    subline: localized('Made to order in Dhaka.'),
    scenes: [{ assetId: sceneAsset, productSlug: 'fluted-niche-panel' }],
  },
  trust: [
    { icon: 'hammer', title: localized('Handcrafted'), text: localized('Made after you order') },
    { icon: 'truck', title: localized('Across Bangladesh'), text: localized('All 64 districts') },
  ],
  collections: [{ categorySlug: 'shelves', assetId: assetB }],
  contact: {},
});

describe('homeContentSchema texts', () => {
  it('defaults to none and keeps owner texts by dictionary path', () => {
    expect(homeContentSchema.parse(draft()).texts).toEqual({});
    const texts = { 'privacy.text': localized('We never sell your data.') };
    expect(homeContentSchema.parse({ ...draft(), texts }).texts).toEqual(texts);
  });

  it('rejects keys that are not dictionary paths', () => {
    for (const key of ['privacy', '__proto__.x', 'Privacy.text', 'a.b c'])
      expect(() =>
        homeContentSchema.parse({ ...draft(), texts: { [key]: localized('x') } }),
      ).toThrow();
  });
});

function setup(state: {
  row?: { version: number; data: unknown } | null;
  assets?: { id: string; storageKey: string; status: string; bytes?: number; mimeType?: string }[];
  readyCount?: number;
  head?: { bytes: number; contentType: string } | null;
}) {
  const updatedAt = new Date('2026-10-24T00:00:00Z');
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    siteContent: {
      findUnique: jest
        .fn()
        .mockResolvedValue(state.row ? { key: 'home', ...state.row, updatedAt } : null),
      create: jest.fn(({ data }: { data: { version: number } }) => ({ ...data, updatedAt })),
      update: jest.fn(({ data }: { data: { version: number } }) => ({ ...data, updatedAt })),
    },
    contentAsset: {
      findMany: jest.fn().mockResolvedValue(state.assets ?? []),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          (state.assets ?? []).find((a) => a.id === where.id) && {
            bytes: 10,
            mimeType: 'image/webp',
            ...(state.assets ?? []).find((a) => a.id === where.id),
          },
        ),
      ),
      count: jest.fn().mockResolvedValue(state.readyCount ?? 0),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    ...tx,
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService;
  const audits: EventEnvelope[] = [];
  const outbox = {
    add: jest.fn((_tx: unknown, e: EventEnvelope) => (audits.push(e), Promise.resolve())),
  } as unknown as OutboxService;
  const storage = {
    publicUrl: (key: string) => `https://media.test/${key}`,
    head: jest
      .fn()
      .mockResolvedValue(
        state.head === undefined ? { bytes: 10, contentType: 'image/webp' } : state.head,
      ),
    createUploadUrl: jest.fn().mockResolvedValue({
      url: 'https://upload.test/x',
      method: 'PUT',
      headers: { 'content-type': 'image/webp' },
      expiresAt: new Date('2026-10-24T01:00:00Z'),
    }),
  } as unknown as StorageProvider;
  return { service: new ContentService(prisma, outbox, storage), tx, audits, storage };
}

describe('homeContentSchema', () => {
  it('fills defaults (positions, empty contact) and rejects bad slugs and positions', () => {
    const parsed = homeContentSchema.parse(draft());
    expect(parsed.hero.scenes[0]).toMatchObject({ position: '76% 50%', phonePosition: '95% 50%' });
    expect(parsed.contact).toEqual({
      phone: '',
      whatsapp: '',
      email: '',
      facebook: '',
      instagram: '',
    });
    const bad = draft();
    bad.hero.scenes[0].productSlug = 'Not A Slug';
    expect(homeContentSchema.safeParse(bad).success).toBe(false);
  });

  it('lists each referenced asset once', () => {
    expect(referencedAssets(homeContentSchema.parse(draft(assetB)))).toEqual([assetB]);
    expect(referencedAssets(homeContentSchema.parse(draft(assetA))).sort()).toEqual(
      [assetA, assetB].sort(),
    );
  });
});

describe('ContentService', () => {
  it('home is null before the first save', async () => {
    const { service } = setup({ row: null });
    await expect(service.home()).resolves.toEqual({ home: null });
  });

  it('resolves only READY assets to URLs', async () => {
    const { service } = setup({
      row: { version: 3, data: homeContentSchema.parse(draft(assetA)) },
      assets: [{ id: assetA, storageKey: `content/${assetA}.webp`, status: 'READY' }],
    });
    const { home } = await service.home();
    expect(home?.version).toBe(3);
    expect(home?.content.hero.scenes[0]?.imageUrl).toBe(
      `https://media.test/content/${assetA}.webp`,
    );
    expect(home?.content.collections[0]?.imageUrl).toBeNull();
  });

  it('first save creates version 1 and is audited', async () => {
    const { service, tx, audits } = setup({ row: null, readyCount: 1 });
    const result = await service.updateHome({ expectedVersion: 0, content: draft() });
    expect(result.version).toBe(1);
    expect(tx.siteContent.create).toHaveBeenCalled();
    expect(audits).toHaveLength(1);
    expect(audits[0]?.type).toBe('audit.recorded');
  });

  it('a stale version is a 409 conflict and nothing is written', async () => {
    const { service, tx } = setup({ row: { version: 2, data: {} }, readyCount: 1 });
    await expect(
      service.updateHome({ expectedVersion: 1, content: draft() }),
    ).rejects.toMatchObject({ code: 'CONTENT_VERSION_CONFLICT' });
    expect(tx.siteContent.update).not.toHaveBeenCalled();
  });

  it('refuses images that are not uploaded yet', async () => {
    const { service } = setup({ row: null, readyCount: 1 });
    await expect(
      service.updateHome({ expectedVersion: 0, content: draft(assetA) }),
    ).rejects.toMatchObject({ code: 'CONTENT_ASSET_NOT_READY' });
  });

  it('upload: a ticket for content/<id>, then confirm checks the stored object', async () => {
    const { service, tx } = setup({});
    const ticket = await service.requestAssetUpload({ mimeType: 'image/webp', bytes: 10 });
    expect(ticket.method).toBe('PUT');
    expect(tx.contentAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ storageKey: `content/${ticket.assetId}.webp` }),
    });

    const pending = { id: assetA, storageKey: `content/${assetA}.webp`, status: 'PENDING' };
    const ok = setup({ assets: [pending] });
    await expect(ok.service.confirmAssetUpload({ assetId: assetA })).resolves.toMatchObject({
      status: 'READY',
    });
    const missing = setup({ assets: [pending], head: null });
    await expect(missing.service.confirmAssetUpload({ assetId: assetA })).rejects.toMatchObject({
      code: 'MEDIA_NOT_UPLOADED',
    });
  });
});
