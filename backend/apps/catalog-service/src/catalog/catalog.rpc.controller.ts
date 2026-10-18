import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CategoryView,
  type ProductDetail,
  type ProductListResponse,
  productListQuerySchema,
  type ResolvePriceRpcRequest,
  type ResolvePriceRpcResponse,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { z } from 'zod';
import { PublicCatalogService } from './public-catalog.service';

const bySlugSchema = z.object({
  slug: z.string().min(1).max(120),
  p: z.string().max(8).optional(),
});
const resolveSchema = z.object({
  variantIds: z.array(z.uuid()).min(1).max(100),
  p: z.string().max(8).optional(),
});

@Controller()
export class CatalogRpcController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @MessagePattern(RPC_PATTERNS.catalog.categoriesList)
  categories(): Promise<{ items: CategoryView[] }> {
    return this.catalog.listCategories();
  }

  @MessagePattern(RPC_PATTERNS.catalog.productsList)
  products(@Payload() req: RpcRequest<unknown>): Promise<ProductListResponse> {
    return this.catalog.listProducts(productListQuerySchema.parse(req.data));
  }

  @MessagePattern(RPC_PATTERNS.catalog.productBySlug)
  bySlug(@Payload() req: RpcRequest<unknown>): Promise<ProductDetail> {
    const { slug, p } = bySlugSchema.parse(req.data);
    return this.catalog.getBySlug(slug, p);
  }

  @MessagePattern(RPC_PATTERNS.catalog.pricesResolve)
  resolve(@Payload() req: RpcRequest<ResolvePriceRpcRequest>): Promise<ResolvePriceRpcResponse> {
    const { variantIds, p } = resolveSchema.parse(req.data);
    return this.catalog.resolvePrices(variantIds, p);
  }
}
