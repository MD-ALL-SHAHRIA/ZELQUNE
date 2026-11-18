import { z } from 'zod';
import { bdPhoneSchema } from '../phone';
import { addressLabelSchema, districtCodeSchema, findArea } from '../shipping/shipping.contracts';

/** A signed-in customer keeps at most this many saved addresses. */
export const MAX_SAVED_ADDRESSES = 10;

/** Create or replace a saved address. The area must be one of the district's areas. */
export const savedAddressInputSchema = z
  .object({
    recipientName: z.string().trim().min(2).max(100),
    phone: bdPhoneSchema,
    district: districtCodeSchema,
    area: z.string().trim().min(1).max(60),
    line: z.string().trim().min(5).max(300),
    landmark: z.string().trim().max(120).nullable().default(null),
    label: addressLabelSchema.nullable().default(null),
    isDefault: z.boolean().default(false),
  })
  .refine((a) => !!findArea(a.district, a.area), {
    path: ['area'],
    message: 'Choose an area from the list',
  });
export type SavedAddressInput = z.input<typeof savedAddressInputSchema>;

export const savedAddressSchema = z.object({
  id: z.string().uuid(),
  recipientName: z.string(),
  phone: z.string(),
  district: z.string(),
  area: z.string(),
  line: z.string(),
  landmark: z.string().nullable(),
  label: addressLabelSchema.nullable(),
  isDefault: z.boolean(),
});
export type SavedAddress = z.infer<typeof savedAddressSchema>;

export const savedAddressListSchema = z.object({ items: z.array(savedAddressSchema) });
export type SavedAddressList = z.infer<typeof savedAddressListSchema>;
