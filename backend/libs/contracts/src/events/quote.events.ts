import { z } from 'zod';
import { defineEvent } from './envelope';

/** New bulk/corporate request; notification-service alerts the owner. */
export const quoteRequested = defineEvent({
  type: 'quote.requested',
  version: 1,
  payload: z.object({
    quoteId: z.uuid(),
    code: z.string(),
    organizationName: z.string(),
    contactName: z.string(),
    itemCount: z.number().int().positive(),
    totalQty: z.number().int().positive(),
    neededBy: z.string().nullable(),
  }),
});
