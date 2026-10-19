import { z } from 'zod';
import {
  experimentKeySchema,
  paisaSchema,
  productStatusSchema,
  saleModeSchema,
} from '../catalog/catalog.contracts';
import { defineEvent } from './envelope';

export const productPublished = defineEvent({
  type: 'product.published',
  version: 1,
  payload: z.object({
    productId: z.uuid(),
    slug: z.string(),
    saleMode: saleModeSchema,
    publishedAt: z.iso.datetime(),
  }),
});

export const productUpdated = defineEvent({
  type: 'product.updated',
  version: 1,
  payload: z.object({
    productId: z.uuid(),
    slug: z.string(),
    status: productStatusSchema,
    changedFields: z.array(z.string()).min(1),
  }),
});

export const priceChanged = defineEvent({
  type: 'price.changed',
  version: 1,
  payload: z.object({
    productId: z.uuid(),
    variantId: z.uuid(),
    amountPaisa: paisaSchema,
    compareAtPaisa: paisaSchema.nullable(),
    previousAmountPaisa: paisaSchema.nullable(),
    /** null for the base price, 'a' | 'b' for a price experiment. */
    experimentKey: experimentKeySchema.nullable(),
  }),
});
