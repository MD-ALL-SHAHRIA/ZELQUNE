import { type INestApplicationContext, Logger } from '@nestjs/common';
import { CatalogAdminService } from '../admin/catalog-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { seedCatalog } from './catalog.seed';

/**
 * DEV-ONLY demo catalog: product concepts inspired by the owner's references, so the storefront
 * can be designed and tested with a real range. Prices are proposals (owner corrects them in the
 * dashboard); lead times stay null (the [[N]] placeholder) until confirmed. Never run in
 * production (requires DEMO_SEED_ALLOWED=true): real products are created in the dashboard.
 */
const CATEGORIES = [
  { slug: 'wall-panels', nameBn: 'ওয়াল প্যানেল', nameEn: 'Wall panels' },
  { slug: 'shelves', nameBn: 'শেলফ', nameEn: 'Shelves' },
  { slug: 'lighting', nameBn: 'আলো', nameEn: 'Lighting' },
] as const;

type CategorySlug = (typeof CATEGORIES)[number]['slug'];

interface DemoProduct {
  slug: string;
  nameBn: string;
  nameEn: string;
  saleMode: 'PRE_ORDER' | 'MADE_TO_ORDER';
  categories: CategorySlug[];
  descriptionBn: string;
  descriptionEn: string;
  /** Integer paisa. */
  pricePaisa: number;
  dimensionsMm: { widthMm: number; heightMm: number };
  package: {
    packageLengthMm: number;
    packageWidthMm: number;
    packageHeightMm: number;
    packageWeightGrams: number;
  };
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: 'diamond-shelf-pair',
    nameBn: 'ডায়মন্ড শেলফ (জোড়া)',
    nameEn: 'Diamond Shelf (pair)',
    saleMode: 'MADE_TO_ORDER',
    categories: ['shelves'],
    descriptionEn:
      'Two diamond-shaped walnut panels with floating shelves for plants and small objects.',
    descriptionBn: 'গাছ আর ছোট জিনিস রাখার ভাসমান তাকসহ দুটো ডায়মন্ড আকৃতির ওয়ালনাট প্যানেল।',
    pricePaisa: 329000,
    dimensionsMm: { widthMm: 450, heightMm: 650 },
    package: {
      packageLengthMm: 700,
      packageWidthMm: 500,
      packageHeightMm: 120,
      packageWeightGrams: 4200,
    },
  },
  {
    slug: 'wave-shelf',
    nameBn: 'ওয়েভ শেলফ',
    nameEn: 'Wave Shelf',
    saleMode: 'MADE_TO_ORDER',
    categories: ['shelves'],
    descriptionEn: 'A curved walnut spine with a black wave and six floating shelves.',
    descriptionBn: 'বাঁকা ওয়ালনাট কাঠামো, কালো ঢেউ আর ছয়টা ভাসমান তাক।',
    pricePaisa: 549000,
    dimensionsMm: { widthMm: 600, heightMm: 1000 },
    package: {
      packageLengthMm: 1050,
      packageWidthMm: 650,
      packageHeightMm: 120,
      packageWeightGrams: 6500,
    },
  },
  {
    slug: 'half-moon-planter-light',
    nameBn: 'হাফ-মুন প্ল্যান্টার লাইট',
    nameEn: 'Half-Moon Planter Light',
    saleMode: 'PRE_ORDER',
    categories: ['lighting', 'wall-panels'],
    descriptionEn: 'A slatted half-moon and a glowing LED ring around a walnut planter column.',
    descriptionBn: 'স্ল্যাটেড অর্ধচন্দ্র আর উজ্জ্বল LED রিং, মাঝে ওয়ালনাট প্ল্যান্টার।',
    pricePaisa: 699000,
    dimensionsMm: { widthMm: 700, heightMm: 900 },
    package: {
      packageLengthMm: 950,
      packageWidthMm: 750,
      packageHeightMm: 150,
      packageWeightGrams: 7000,
    },
  },
  {
    slug: 'fluted-niche-panel',
    nameBn: 'ফ্লুটেড নিশ প্যানেল',
    nameEn: 'Fluted Niche Panel',
    saleMode: 'PRE_ORDER',
    categories: ['wall-panels', 'lighting'],
    descriptionEn: 'Fluted walnut with warm LED lines, a lit niche and two floating shelves.',
    descriptionBn: 'উষ্ণ LED লাইনসহ ফ্লুটেড ওয়ালনাট, আলোকিত নিশ আর দুটো ভাসমান তাক।',
    pricePaisa: 899000,
    dimensionsMm: { widthMm: 900, heightMm: 1800 },
    package: {
      packageLengthMm: 1900,
      packageWidthMm: 950,
      packageHeightMm: 150,
      packageWeightGrams: 15000,
    },
  },
  {
    slug: 'capsule-vase-light',
    nameBn: 'ক্যাপসুল ভাস লাইট',
    nameEn: 'Capsule Vase Light',
    saleMode: 'PRE_ORDER',
    categories: ['lighting', 'wall-panels'],
    descriptionEn: 'A capsule frame with a soft LED halo and a glass vase for fresh stems.',
    descriptionBn: 'নরম LED আলোর ক্যাপসুল ফ্রেম, তাজা ফুলের জন্য কাচের ফুলদানি।',
    pricePaisa: 449000,
    dimensionsMm: { widthMm: 350, heightMm: 700 },
    package: {
      packageLengthMm: 760,
      packageWidthMm: 420,
      packageHeightMm: 120,
      packageWeightGrams: 3000,
    },
  },
];

const FINISHES = [
  { suffix: 'WALNUT', options: { finish: 'WALNUT' }, position: 0 },
  { suffix: 'NATURAL', options: { finish: 'NATURAL' }, position: 1 },
] as const;

export async function seedDemoCatalog(app: INestApplicationContext): Promise<void> {
  const logger = new Logger('DemoSeed');
  // Explicit opt-in (set only by `pnpm seed:demo` on the dev stack): images run with
  // NODE_ENV=production everywhere, so NODE_ENV cannot tell dev from production.
  if (process.env.DEMO_SEED_ALLOWED !== 'true') {
    throw new Error('The demo catalog is for development only (set DEMO_SEED_ALLOWED=true).');
  }
  await seedCatalog(app);
  const prisma = app.get(PrismaService);
  const admin = app.get(CatalogAdminService);

  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    categoryIds.set(c.slug, existing?.id ?? (await admin.createCategory(c)).id);
  }
  // The pre-order test product also belongs on the wall-panels shelf.
  const alo = await prisma.product.findUnique({ where: { slug: 'alo-arch-panel' } });
  const wallPanels = categoryIds.get('wall-panels');
  if (alo && wallPanels) {
    const current = await prisma.productCategory.findMany({ where: { productId: alo.id } });
    if (!current.some((c) => c.categoryId === wallPanels)) {
      // Through the admin service so the change is audited and published like any other.
      await admin.updateProduct({
        productId: alo.id,
        changes: { categoryIds: [...current.map((c) => c.categoryId), wallPanels] },
      });
    }
  }

  for (const p of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const productId =
      existing?.id ??
      (
        await admin.createProduct({
          slug: p.slug,
          nameBn: p.nameBn,
          nameEn: p.nameEn,
          saleMode: p.saleMode,
          leadTimeDays: null,
          descriptionBn: p.descriptionBn,
          descriptionEn: p.descriptionEn,
          seoTitleBn: `${p.nameBn} | Zelqune`,
          seoTitleEn: `${p.nameEn} | Zelqune`,
          categoryIds: p.categories.map((slug) => categoryIds.get(slug) ?? ''),
        })
      ).id;
    for (const f of FINISHES) {
      const { id: variantId } = await admin.upsertVariant({
        productId,
        sku: `${p.slug.toUpperCase()}-${f.suffix}`,
        options: { ...f.options },
        position: f.position,
        ...p.dimensionsMm,
        ...p.package,
      });
      await admin.setBasePrice({ variantId, amountPaisa: p.pricePaisa });
    }
    await admin.publishProduct({ productId });
  }
  logger.log(
    `Demo catalog seeded: ${DEMO_PRODUCTS.length} products in ${CATEGORIES.length} categories`,
  );
}
