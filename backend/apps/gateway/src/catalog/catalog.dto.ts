import { createZodDto } from '@zelqune/common';
import {
  categoryListResponseSchema,
  productDetailQuerySchema,
  productDetailSchema,
  productListQuerySchema,
  productListResponseSchema,
} from '@zelqune/contracts';
import { z } from 'zod';

export class ProductListQueryDto extends createZodDto(productListQuerySchema) {}
export class ProductDetailQueryDto extends createZodDto(productDetailQuerySchema) {}
export class ProductSlugParamDto extends createZodDto(
  z.object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/),
  }),
) {}
export class ProductListResponseDto extends createZodDto(productListResponseSchema) {}
export class ProductDetailDto extends createZodDto(productDetailSchema) {}
export class CategoryListResponseDto extends createZodDto(categoryListResponseSchema) {}
