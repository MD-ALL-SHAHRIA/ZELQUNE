import { z } from 'zod';
import { MAX_MEDIA_BYTES, MEDIA_MIME_TYPES } from '../catalog/catalog.contracts';

/**
 * Storefront content the owner edits from the dashboard (ADR 0015): the home page's hero scenes,
 * trust strip, collections order, announcement bar, and contact links. Stored as one versioned
 * document per key in catalog-service. Every text is given in English and Bangla.
 */

const text = (max: number) => z.string().trim().max(max);
export const localizedSchema = (max: number) => z.object({ en: text(max), bn: text(max) });
export type Localized = z.infer<ReturnType<typeof localizedSchema>>;

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** CSS object-position like "76% 50%". */
const position = z.string().regex(/^\d{1,3}% \d{1,3}%$/);
const optionalUrl = z.union([z.url().max(300), z.literal('')]);

export const TRUST_ICONS = [
  'hammer',
  'lightbulb',
  'coins',
  'truck',
  'leaf',
  'shield',
  'hand',
  'sparkles',
] as const;

export const heroSceneSchema = z.object({
  /** Uploaded content asset (READY). Without one, the storefront uses its sample scene. */
  assetId: z.uuid().nullable().default(null),
  productSlug: slug,
  position: position.default('76% 50%'),
  phonePosition: position.default('95% 50%'),
});

export const PROJECT_KINDS = ['DESIGN', 'CONSTRUCTION'] as const;

/** A finished project shown on the interior design or construction page. */
export const projectSchema = z.object({
  kind: z.enum(PROJECT_KINDS),
  title: localizedSchema(80),
  location: localizedSchema(60),
  text: localizedSchema(400),
  assetIds: z.array(z.uuid()).max(6).default([]),
});

/** A business that bought from Zelqune, shown in the home page's logo strip. */
export const clientSchema = z.object({
  name: text(60).min(1),
  assetId: z.uuid().nullable().default(null),
  url: optionalUrl.default(''),
});

export const homeContentSchema = z.object({
  announcement: localizedSchema(140),
  hero: z.object({
    eyebrow: localizedSchema(80),
    heading: localizedSchema(160),
    accent: localizedSchema(60),
    subline: localizedSchema(200),
    scenes: z.array(heroSceneSchema).min(1).max(8),
  }),
  trust: z
    .array(
      z.object({
        icon: z.enum(TRUST_ICONS),
        title: localizedSchema(40),
        text: localizedSchema(80),
      }),
    )
    .min(2)
    .max(6),
  collections: z
    .array(z.object({ categorySlug: slug, assetId: z.uuid().nullable().default(null) }))
    .max(12),
  contact: z.object({
    phone: text(20).default(''),
    whatsapp: z
      .string()
      .regex(/^(\d{8,15})?$/)
      .default(''),
    email: z.union([z.email().max(120), z.literal('')]).default(''),
    facebook: optionalUrl.default(''),
    instagram: optionalUrl.default(''),
  }),
  /**
   * Owner overrides of storefront copy, keyed by dictionary path ("privacy.text"). The storefront
   * applies only the paths it lists as editable; an empty language keeps the built-in text.
   */
  texts: z
    .record(
      z
        .string()
        .max(80)
        .regex(/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+){1,5}$/),
      localizedSchema(3000),
    )
    .refine((t) => Object.keys(t).length <= 80, 'Too many texts')
    .default({}),
  projects: z.array(projectSchema).max(24).default([]),
  clients: z.array(clientSchema).max(30).default([]),
});
export type HomeContent = z.infer<typeof homeContentSchema>;
export type HomeContentInput = z.input<typeof homeContentSchema>;

/** Public view: the document with every asset id resolved to a URL (READY assets only). */
export const homeContentViewSchema = z.object({
  version: z.number().int(),
  updatedAt: z.string(),
  content: homeContentSchema.extend({
    hero: homeContentSchema.shape.hero.extend({
      scenes: z.array(heroSceneSchema.extend({ imageUrl: z.string().nullable() })),
    }),
    collections: z.array(
      z.object({
        categorySlug: slug,
        assetId: z.uuid().nullable(),
        imageUrl: z.string().nullable(),
      }),
    ),
    /** Only READY photos, in order. */
    projects: z.array(projectSchema.extend({ imageUrls: z.array(z.string()) })),
    clients: z.array(clientSchema.extend({ logoUrl: z.string().nullable() })),
  }),
});
export type HomeContentView = z.infer<typeof homeContentViewSchema>;
/** `null` until the owner saves content for the first time (the storefront uses its copy). */
export const homeContentResponseSchema = z.object({ home: homeContentViewSchema.nullable() });
export type HomeContentResponse = z.infer<typeof homeContentResponseSchema>;

/** Save: optimistic concurrency, `expectedVersion` is 0 for the first save. */
export const updateHomeContentInputSchema = z.object({
  expectedVersion: z.number().int().min(0),
  content: homeContentSchema,
});
export type UpdateHomeContentInput = z.input<typeof updateHomeContentInputSchema>;
export const updateHomeContentResultSchema = z.object({
  version: z.number().int(),
  updatedAt: z.string(),
});

export const requestContentAssetUploadInputSchema = z.object({
  mimeType: z.enum(MEDIA_MIME_TYPES),
  bytes: z.number().int().positive().max(MAX_MEDIA_BYTES),
});
export type RequestContentAssetUploadInput = z.input<typeof requestContentAssetUploadInputSchema>;
export const contentAssetTicketSchema = z.object({
  assetId: z.uuid(),
  uploadUrl: z.string(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});
export type ContentAssetTicket = z.infer<typeof contentAssetTicketSchema>;
export const contentAssetIdInputSchema = z.object({ assetId: z.uuid() });
export const contentAssetSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  status: z.enum(['PENDING', 'READY']),
});
export type ContentAsset = z.infer<typeof contentAssetSchema>;
