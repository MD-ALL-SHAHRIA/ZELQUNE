import { type INestApplicationContext, Logger } from '@nestjs/common';
import { CatalogAdminService } from '../admin/catalog-admin.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Pre-order test catalog (docs/website-spec.md). Idempotent: re-running changes nothing and
 * emits no new events. Facts come from the spec; unknowns (lead time, weight, depth) stay null
 * until the prototype is finished. Copy is a placeholder until the final Bangla copy arrives.
 */
export const SEED = {
  category: { slug: 'lighting', nameBn: 'আলো', nameEn: 'Lighting' },
  product: {
    slug: 'alo-arch-panel',
    nameBn: 'আলো-আর্চ প্যানেল',
    nameEn: 'Alo-Arch Panel',
    saleMode: 'PRE_ORDER' as const,
    leadTimeDays: null,
    descriptionBn:
      'ওয়ালনাট ভিনিয়ার আর ক্রিম ফ্রেমের দেয়ালে লাগানোর প্যানেল, কাচের টিউবের ভেতরে ৫V USB উষ্ণ আলো। মাপ ৩২×৬৪ সেমি, সাথে দেয়ালে লাগানোর কিট। অর্ডার অনুযায়ী বানানো হয় (প্রি-অর্ডার)।',
    descriptionEn:
      'Wall-mounted panel in walnut veneer with a cream frame and warm 5V USB light inside a glass tube. 32 × 64 cm, wall-mounting kit included. Made to order (pre-order).',
    seoTitleBn: 'আলো-আর্চ প্যানেল | Zelqune',
    seoTitleEn: 'Alo-Arch Panel | Zelqune',
  },
  variants: [
    { sku: 'ALO-ARCH-WALNUT', options: { finish: 'WALNUT' }, position: 0 },
    { sku: 'ALO-ARCH-NATURAL', options: { finish: 'NATURAL' }, position: 1 },
  ],
  /** ৳3,490 base; price test a = ৳3,490, b = ৳4,290 (integer paisa). */
  basePricePaisa: 349000,
  experiments: { a: 349000, b: 429000 },
  dimensionsMm: { widthMm: 320, heightMm: 640 },
} as const;

export async function seedCatalog(app: INestApplicationContext): Promise<void> {
  const logger = new Logger('Seed');
  const prisma = app.get(PrismaService);
  const admin = app.get(CatalogAdminService);

  const category =
    (await prisma.category.findUnique({ where: { slug: SEED.category.slug } })) ??
    (await admin.createCategory(SEED.category));

  const existing = await prisma.product.findUnique({ where: { slug: SEED.product.slug } });
  const productId =
    existing?.id ?? (await admin.createProduct({ ...SEED.product, categoryIds: [category.id] })).id;

  for (const v of SEED.variants) {
    const { id: variantId } = await admin.upsertVariant({
      productId,
      sku: v.sku,
      options: { ...v.options },
      position: v.position,
      ...SEED.dimensionsMm,
    });
    await admin.setBasePrice({ variantId, amountPaisa: SEED.basePricePaisa });
    for (const [key, amountPaisa] of Object.entries(SEED.experiments) as ['a' | 'b', number][]) {
      await admin.setExperimentPrice({ variantId, key, amountPaisa });
    }
  }
  await admin.publishProduct({ productId });
  logger.log(
    `Catalog seeded: ${SEED.product.slug} (${SEED.variants.length} variants, experiments a/b)`,
  );
}
