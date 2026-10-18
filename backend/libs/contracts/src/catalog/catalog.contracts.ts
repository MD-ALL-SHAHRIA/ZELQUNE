import { z } from 'zod';

export const SALE_MODES = ['IN_STOCK', 'MADE_TO_ORDER', 'PRE_ORDER'] as const;
export const saleModeSchema = z.enum(SALE_MODES);
export type SaleMode = z.infer<typeof saleModeSchema>;

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const EXPERIMENT_KEYS = ['a', 'b'] as const;
export const experimentKeySchema = z.enum(EXPERIMENT_KEYS);
export type ExperimentKey = z.infer<typeof experimentKeySchema>;

/** Money is always integer paisa (৳3,490 = 349000). */
export const paisaSchema = z.number().int().nonnegative().meta({ example: 349000 });

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase letters, digits and single dashes');

// ---------- Public read models ----------

export const resolvedPriceSchema = z.object({
  amountPaisa: paisaSchema,
  compareAtPaisa: paisaSchema.nullable(),
  currency: z.literal('BDT'),
  /** Set when the price came from a price experiment (?p=a|b). */
  experimentKey: experimentKeySchema.nullable(),
});
export type ResolvedPrice = z.infer<typeof resolvedPriceSchema>;

export const categorySchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  slug: z.string(),
  nameBn: z.string(),
  nameEn: z.string(),
  position: z.number().int(),
});
export type CategoryView = z.infer<typeof categorySchema>;

export const mediaSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  mimeType: z.string(),
  altBn: z.string().nullable(),
  altEn: z.string().nullable(),
  position: z.number().int(),
  variantId: z.uuid().nullable(),
});
export type MediaView = z.infer<typeof mediaSchema>;

export const dimensionsSchema = z.object({
  widthMm: z.number().int().positive().nullable(),
  heightMm: z.number().int().positive().nullable(),
  depthMm: z.number().int().positive().nullable(),
});

export const variantSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  options: z.record(z.string(), z.string()).meta({ example: { finish: 'WALNUT' } }),
  weightGrams: z.number().int().positive().nullable(),
  dimensions: dimensionsSchema,
  position: z.number().int(),
  price: resolvedPriceSchema.nullable(),
});
export type VariantView = z.infer<typeof variantSchema>;

export const productSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  nameBn: z.string(),
  nameEn: z.string(),
  saleMode: saleModeSchema,
  leadTimeDays: z.number().int().nonnegative().nullable(),
  /** Lowest resolved price across active variants. */
  fromPrice: resolvedPriceSchema.nullable(),
  primaryMedia: mediaSchema.nullable(),
});
export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productDetailSchema = productSummarySchema.extend({
  descriptionBn: z.string().nullable(),
  descriptionEn: z.string().nullable(),
  seo: z.object({
    titleBn: z.string().nullable(),
    titleEn: z.string().nullable(),
    descriptionBn: z.string().nullable(),
    descriptionEn: z.string().nullable(),
  }),
  categories: z.array(categorySchema.pick({ id: true, slug: true, nameBn: true, nameEn: true })),
  variants: z.array(variantSchema),
  media: z.array(mediaSchema),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;

export const productListQuerySchema = z.object({
  category: slugSchema.optional(),
  saleMode: saleModeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Price experiment bucket; unknown values are ignored. */
  p: z.string().max(8).optional(),
});
export type ProductListQuery = z.output<typeof productListQuerySchema>;

export const productDetailQuerySchema = productListQuerySchema.pick({ p: true });

export const productListResponseSchema = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const categoryListResponseSchema = z.object({ items: z.array(categorySchema) });

// ---------- Admin write inputs (TCP use-cases now; gateway routes in step 1.3) ----------

const textBn = z.string().trim().min(1).max(200);
const longText = z.string().trim().max(10_000);

export const createCategoryInputSchema = z.object({
  slug: slugSchema,
  nameBn: textBn,
  nameEn: textBn,
  parentId: z.uuid().nullable().default(null),
  position: z.number().int().default(0),
});
export type CreateCategoryInput = z.input<typeof createCategoryInputSchema>;

const productFieldsSchema = z.object({
  slug: slugSchema,
  nameBn: textBn,
  nameEn: textBn,
  descriptionBn: longText.nullable().default(null),
  descriptionEn: longText.nullable().default(null),
  saleMode: saleModeSchema,
  leadTimeDays: z.number().int().nonnegative().max(365).nullable().default(null),
  seoTitleBn: z.string().max(70).nullable().default(null),
  seoTitleEn: z.string().max(70).nullable().default(null),
  seoDescriptionBn: z.string().max(160).nullable().default(null),
  seoDescriptionEn: z.string().max(160).nullable().default(null),
  categoryIds: z.array(z.uuid()).default([]),
});

export const createProductInputSchema = productFieldsSchema;
export type CreateProductInput = z.input<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  productId: z.uuid(),
  changes: productFieldsSchema.partial().refine((c) => Object.keys(c).length > 0, 'No changes'),
});
export type UpdateProductInput = z.input<typeof updateProductInputSchema>;

export const productIdInputSchema = z.object({ productId: z.uuid() });

export const upsertVariantInputSchema = z.object({
  productId: z.uuid(),
  sku: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9-]+$/),
  options: z.record(z.string(), z.string()).default({}),
  weightGrams: z.number().int().positive().nullable().default(null),
  widthMm: z.number().int().positive().nullable().default(null),
  heightMm: z.number().int().positive().nullable().default(null),
  depthMm: z.number().int().positive().nullable().default(null),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type UpsertVariantInput = z.input<typeof upsertVariantInputSchema>;

export const setBasePriceInputSchema = z
  .object({
    variantId: z.uuid(),
    amountPaisa: paisaSchema,
    compareAtPaisa: paisaSchema.nullable().default(null),
  })
  .refine((v) => v.compareAtPaisa === null || v.compareAtPaisa > v.amountPaisa, {
    message: 'compareAtPaisa must be greater than amountPaisa',
    path: ['compareAtPaisa'],
  });
export type SetBasePriceInput = z.input<typeof setBasePriceInputSchema>;

export const setExperimentPriceInputSchema = z.object({
  variantId: z.uuid(),
  key: experimentKeySchema,
  amountPaisa: paisaSchema,
  active: z.boolean().default(true),
});
export type SetExperimentPriceInput = z.input<typeof setExperimentPriceInputSchema>;

export const MEDIA_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'] as const;
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const requestMediaUploadInputSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().default(null),
  mimeType: z.enum(MEDIA_MIME_TYPES),
  bytes: z.number().int().positive().max(MAX_MEDIA_BYTES),
  altBn: z.string().max(200).nullable().default(null),
  altEn: z.string().max(200).nullable().default(null),
  position: z.number().int().default(0),
});
export type RequestMediaUploadInput = z.input<typeof requestMediaUploadInputSchema>;

export interface MediaUploadTicket {
  mediaId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

export const confirmMediaUploadInputSchema = z.object({ mediaId: z.uuid() });

export interface ResolvePriceRpcRequest {
  variantIds: string[];
  p?: string;
}
export type ResolvePriceRpcResponse = Record<string, ResolvedPrice | null>;
