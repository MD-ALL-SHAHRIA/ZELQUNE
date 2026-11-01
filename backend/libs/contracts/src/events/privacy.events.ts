import { z } from 'zod';
import { defineEvent } from './envelope';

/**
 * A verified deletion request was carried out in order-service. Other services remove what they
 * hold for these orders (payer phone, SMS contacts and logs) and unlink analytics.
 */
export const privacyErased = defineEvent({
  type: 'privacy.erased',
  version: 1,
  payload: z.object({
    requestId: z.uuid(),
    phone: z.string(),
    customerKey: z.string(),
    erasedOrderIds: z.array(z.uuid()),
  }),
});
