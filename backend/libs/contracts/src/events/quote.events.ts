import { z } from 'zod';
import { defineEvent } from './envelope';

/**
 * New bulk/corporate request, interior design consultation or construction enquiry; notification-service alerts the
 * owner. v1 evolution (ADR 0010): kind and spaceType added as optional fields; organizationName
 * may be null for design requests from homes.
 */
export const quoteRequested = defineEvent({
  type: 'quote.requested',
  version: 1,
  payload: z.object({
    quoteId: z.uuid(),
    code: z.string(),
    kind: z.enum(['PRODUCT', 'DESIGN', 'CONSTRUCTION']).default('PRODUCT'),
    spaceType: z.string().nullable().default(null),
    organizationName: z.string().nullable(),
    contactName: z.string(),
    itemCount: z.number().int().nonnegative(),
    totalQty: z.number().int().nonnegative(),
    neededBy: z.string().nullable(),
  }),
});
