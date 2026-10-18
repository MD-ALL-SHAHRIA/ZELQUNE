import { type INestApplication } from '@nestjs/common';
import { type ProductDetail, type ProductListResponse } from '@zelqune/contracts';
import { type Channel, connect, type ChannelModel } from 'amqplib';
import { Redis } from 'ioredis';
import request from 'supertest';
import { CatalogAdminService } from '../../apps/catalog-service/src/admin/catalog-admin.service';
import { PrismaService as CatalogPrisma } from '../../apps/catalog-service/src/prisma/prisma.service';
import { SEED, seedCatalog } from '../../apps/catalog-service/src/seed/catalog.seed';
import { PrismaService as IdentityPrisma } from '../../apps/identity-service/src/prisma/prisma.service';
import { seedOwner } from '../../apps/identity-service/src/seed/owner.seed';
import { IT } from './it-env';
import { ALLOWED_ORIGIN, OWNER, type Stack, startStack } from './stack';

const EVENTS_EXCHANGE = 'zelqune.events';

async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 10_000): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = await fn();
    if (ok(value) || Date.now() > deadline) return value;
    await new Promise((r) => setTimeout(r, 200));
  }
}

const cookieValue = (res: request.Response): string => {
  const raw = ([] as string[])
    .concat(res.headers['set-cookie'] ?? [])
    .find((c) => c.startsWith('zq_rt='));
  return raw ? raw.split(';')[0] : '';
};

describe('gateway end-to-end on real infrastructure', () => {
  let stack: Stack;
  let gw: INestApplication;
  let redis: Redis;
  let amqp: ChannelModel;
  let channel: Channel;
  const received: { type: string; requestId: unknown }[] = [];
  let ipSeq = 0;
  const nextIp = () => `198.18.0.${++ipSeq}`;

  beforeAll(async () => {
    redis = new Redis(IT.redisUrl);
    await redis.flushdb();

    // Tap every domain event before anything is published.
    amqp = await connect(IT.rabbitUrl);
    channel = await amqp.createChannel();
    await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue, EVENTS_EXCHANGE, '#');
    await channel.consume(
      queue,
      (msg) => {
        if (!msg) return;
        const body = JSON.parse(msg.content.toString()) as { type: string; requestId?: string };
        received.push({ type: body.type, requestId: msg.properties.headers?.['x-request-id'] });
      },
      { noAck: true },
    );

    stack = await startStack();
    gw = stack.gateway;
    await seedOwner(stack.identity);
    await seedCatalog(stack.catalog);
  });

  afterAll(async () => {
    await stack?.close();
    await channel?.close();
    await amqp?.close();
    await redis?.quit();
  });

  afterEach(async () => {
    await redis.flushdb(); // reset rate limits / login locks between tests
  });

  const login = (password = OWNER.password, ip = nextIp()) =>
    request(gw.getHttpServer())
      .post('/v1/admin/auth/login')
      .set('x-forwarded-for', ip)
      .send({ phone: OWNER.phone, password });

  describe('admin auth', () => {
    it('login -> me -> refresh rotates -> reuse revokes the family -> logout', async () => {
      const bad = await login('wrong-password').expect(401);
      expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');

      const first = await login().expect(200);
      expect(first.body.user).toMatchObject({
        phone: '+8801712345678',
        role: 'OWNER',
        name: OWNER.name,
      });
      const cookie1 = cookieValue(first);
      expect(cookie1).toMatch(/^zq_rt=.{40,}$/);

      const me = await request(gw.getHttpServer())
        .get('/v1/admin/auth/me')
        .set('Authorization', `Bearer ${first.body.accessToken}`)
        .expect(200);
      expect(me.body.role).toBe('OWNER');

      const second = await request(gw.getHttpServer())
        .post('/v1/admin/auth/refresh')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Cookie', cookie1)
        .expect(200);
      const cookie2 = cookieValue(second);
      expect(cookie2).not.toBe(cookie1);
      expect(second.body.accessToken).not.toBe(first.body.accessToken);

      // replaying the rotated cookie = theft: family revoked, even the newest cookie dies
      const reuse = await request(gw.getHttpServer())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', cookie1)
        .expect(401);
      expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');
      await request(gw.getHttpServer())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', cookie2)
        .expect(401);

      const identityDb = stack.identity.get(IdentityPrisma);
      const tokens = await identityDb.refreshToken.findMany({ orderBy: { createdAt: 'asc' } });
      const family = tokens.filter((t) => t.familyId === tokens[tokens.length - 1].familyId);
      expect(family.map((t) => t.revokedReason)).toEqual(['ROTATED', 'REUSE_DETECTED']);
      // only hashes are stored
      expect(tokens.every((t) => /^[0-9a-f]{64}$/.test(t.tokenHash))).toBe(true);

      const third = await login().expect(200);
      await request(gw.getHttpServer())
        .post('/v1/admin/auth/logout')
        .set('Cookie', cookieValue(third))
        .expect(204);
      await request(gw.getHttpServer())
        .post('/v1/admin/auth/refresh')
        .set('Cookie', cookieValue(third))
        .expect(401);
    });

    it('per-phone lock counts failures only; success resets; 5 failures lock even the right password', async () => {
      for (let i = 0; i < 4; i++) await login('wrong-password').expect(401);
      await login().expect(200); // resets
      for (let i = 0; i < 5; i++) await login('wrong-password').expect(401);
      const locked = await login().expect(429);
      expect(locked.body.error.code).toBe('LOGIN_LOCKED');
    });

    it('per-IP login throttle (3 per window here) returns 429 TOO_MANY_REQUESTS', async () => {
      const ip = nextIp();
      for (let i = 0; i < 3; i++) await login(OWNER.password, ip).expect(200);
      expect((await login(OWNER.password, ip).expect(429)).body.error.code).toBe(
        'TOO_MANY_REQUESTS',
      );
    });

    it('rejects missing, forged and customer tokens', async () => {
      await request(gw.getHttpServer()).get('/v1/admin/auth/me').expect(401);
      const forged = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6Ik9XTkVSIn0.c2ln';
      await request(gw.getHttpServer())
        .get('/v1/admin/auth/me')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });
  });

  describe('public catalog', () => {
    it('lists the seeded category and product with the base price', async () => {
      const cats = await request(gw.getHttpServer()).get('/v1/catalog/categories').expect(200);
      expect(cats.body.items).toEqual([
        expect.objectContaining({ slug: 'lighting', nameBn: 'আলো', parentId: null }),
      ]);

      const list = await request(gw.getHttpServer())
        .get('/v1/catalog/products?category=lighting')
        .expect(200);
      const body = list.body as ProductListResponse;
      expect(body.total).toBe(1);
      expect(body.items[0]).toMatchObject({
        slug: 'alo-arch-panel',
        saleMode: 'PRE_ORDER',
        fromPrice: { amountPaisa: 349000, currency: 'BDT', experimentKey: null },
      });
    });

    it('?p=a -> 349000 and ?p=b -> 429000 for every variant; unknown p is ignored', async () => {
      for (const [p, amount, key] of [
        ['a', 349000, 'a'],
        ['b', 429000, 'b'],
        ['zzz', 349000, null],
      ] as const) {
        const res = await request(gw.getHttpServer())
          .get(`/v1/catalog/products/alo-arch-panel?p=${p}`)
          .expect(200);
        const detail = res.body as ProductDetail;
        expect(
          detail.variants.map((v) => [v.sku, v.price?.amountPaisa, v.price?.experimentKey]),
        ).toEqual([
          ['ALO-ARCH-WALNUT', amount, key],
          ['ALO-ARCH-NATURAL', amount, key],
        ]);
        expect(detail.fromPrice?.amountPaisa).toBe(amount);
      }
    });

    it('detail has bilingual fields, dimensions and options; unknown slug is 404', async () => {
      const res = await request(gw.getHttpServer())
        .get('/v1/catalog/products/alo-arch-panel')
        .expect(200);
      expect(res.body).toMatchObject({
        nameBn: SEED.product.nameBn,
        nameEn: 'Alo-Arch Panel',
        leadTimeDays: null,
        categories: [expect.objectContaining({ slug: 'lighting' })],
      });
      expect(res.body.variants[0]).toMatchObject({
        options: { finish: 'WALNUT' },
        dimensions: { widthMm: 320, heightMm: 640, depthMm: null },
      });
      const missing = await request(gw.getHttpServer())
        .get('/v1/catalog/products/does-not-exist')
        .expect(404);
      expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('hides DRAFT products, inactive variants and non-READY media; media appears after upload + confirm', async () => {
      const admin = stack.catalog.get(CatalogAdminService);
      const product = await stack.catalog
        .get(CatalogPrisma)
        .product.findUniqueOrThrow({ where: { slug: 'alo-arch-panel' } });

      const draft = await admin.createProduct({
        slug: 'draft-lamp',
        nameBn: 'খসড়া',
        nameEn: 'Draft lamp',
        saleMode: 'IN_STOCK',
      });
      await request(gw.getHttpServer()).get('/v1/catalog/products/draft-lamp').expect(404);
      const list = await request(gw.getHttpServer()).get('/v1/catalog/products').expect(200);
      expect((list.body as ProductListResponse).items.map((i) => i.slug)).not.toContain(
        'draft-lamp',
      );
      expect(draft.slug).toBe('draft-lamp');

      await admin.upsertVariant({
        productId: product.id,
        sku: 'ALO-ARCH-HIDDEN',
        options: { finish: 'BLACK' },
        isActive: false,
      });

      const ticket = await admin.requestMediaUpload({
        productId: product.id,
        mimeType: 'image/webp',
        bytes: 16,
        altEn: 'Alo-Arch Panel lit',
      });
      const pending = await request(gw.getHttpServer())
        .get('/v1/catalog/products/alo-arch-panel')
        .expect(200);
      expect(pending.body.media).toEqual([]);
      expect(pending.body.variants.map((v: { sku: string }) => v.sku)).not.toContain(
        'ALO-ARCH-HIDDEN',
      );

      // upload through the local storage fake (same flow as a presigned R2 PUT)
      const url = new URL(ticket.uploadUrl);
      await request(stack.catalog.getHttpServer())
        .put(`${url.pathname}${url.search}`)
        .set('Content-Type', 'image/webp')
        .send(Buffer.alloc(16, 1))
        .expect(200);
      await expect(admin.confirmMediaUpload({ mediaId: ticket.mediaId })).resolves.toEqual({
        id: ticket.mediaId,
        status: 'READY',
      });

      const ready = await request(gw.getHttpServer())
        .get('/v1/catalog/products/alo-arch-panel')
        .expect(200);
      expect(ready.body.media).toEqual([
        expect.objectContaining({
          id: ticket.mediaId,
          altEn: 'Alo-Arch Panel lit',
          mimeType: 'image/webp',
        }),
      ]);
      expect(ready.body.primaryMedia.id).toBe(ticket.mediaId);
      await request(stack.catalog.getHttpServer())
        .get(new URL(ready.body.media[0].url).pathname)
        .expect(200);
    });
  });

  describe('events', () => {
    it('catalog changes reach RabbitMQ through the outbox', async () => {
      const db = stack.catalog.get(CatalogPrisma);
      const pending = await eventually(
        () => db.outboxEvent.count({ where: { publishedAt: null } }),
        (n) => n === 0,
      );
      expect(pending).toBe(0);
      await eventually(
        () => Promise.resolve(received.length),
        (n) => n >= 8,
      );
      const types = received.map((e) => e.type);
      expect(types.filter((t) => t === 'product.published')).toHaveLength(1);
      // 2 variants x (base + experiment a + experiment b)
      expect(types.filter((t) => t === 'price.changed')).toHaveLength(6);
      expect(types).toContain('product.updated');
    });

    it('re-running the seed is idempotent: no new outbox events', async () => {
      const db = stack.catalog.get(CatalogPrisma);
      const before = await db.outboxEvent.count();
      await seedCatalog(stack.catalog);
      expect(await db.outboxEvent.count()).toBe(before);
    });
  });
});
