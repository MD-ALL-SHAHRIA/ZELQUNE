import { z } from 'zod';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  adminProductListQuerySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateProductInput,
  type RequestMediaUploadInput,
  RPC_PATTERNS,
  type RpcRequest,
  type SetBasePriceInput,
  type SetExperimentPriceInput,
  type UpdateProductInput,
  type UpsertVariantInput,
} from '@zelqune/contracts';
import { CatalogAdminQueries } from './catalog-admin.queries';
import { CatalogAdminService } from './catalog-admin.service';

const P = RPC_PATTERNS.catalog.admin;

/** Internal only: the gateway will expose these behind OWNER/STAFF routes in step 1.3. */
@Controller()
export class CatalogAdminRpcController {
  constructor(
    private readonly admin: CatalogAdminService,
    private readonly queries: CatalogAdminQueries,
  ) {}

  @MessagePattern(P.createCategory)
  createCategory(@Payload() req: RpcRequest<CreateCategoryInput>) {
    return this.admin.createCategory(req.data);
  }

  @MessagePattern(P.createProduct)
  createProduct(@Payload() req: RpcRequest<CreateProductInput>) {
    return this.admin.createProduct(req.data);
  }

  @MessagePattern(P.updateProduct)
  updateProduct(@Payload() req: RpcRequest<UpdateProductInput>) {
    return this.admin.updateProduct(req.data);
  }

  @MessagePattern(P.publishProduct)
  publishProduct(@Payload() req: RpcRequest<{ productId: string }>) {
    return this.admin.publishProduct(req.data);
  }

  @MessagePattern(P.upsertVariant)
  upsertVariant(@Payload() req: RpcRequest<UpsertVariantInput>) {
    return this.admin.upsertVariant(req.data);
  }

  @MessagePattern(P.setBasePrice)
  setBasePrice(@Payload() req: RpcRequest<SetBasePriceInput>) {
    return this.admin.setBasePrice(req.data);
  }

  @MessagePattern(P.setExperimentPrice)
  setExperimentPrice(@Payload() req: RpcRequest<SetExperimentPriceInput>) {
    return this.admin.setExperimentPrice(req.data);
  }

  @MessagePattern(P.requestMediaUpload)
  requestMediaUpload(@Payload() req: RpcRequest<RequestMediaUploadInput>) {
    return this.admin.requestMediaUpload(req.data);
  }

  @MessagePattern(P.confirmMediaUpload)
  confirmMediaUpload(@Payload() req: RpcRequest<{ mediaId: string }>) {
    return this.admin.confirmMediaUpload(req.data);
  }

  @MessagePattern(P.listCategories)
  listCategories() {
    return this.queries.listCategories();
  }

  @MessagePattern(P.updateCategory)
  updateCategory(@Payload() req: RpcRequest<UpdateCategoryInput>) {
    return this.admin.updateCategory(req.data);
  }

  @MessagePattern(P.listProducts)
  listProducts(@Payload() req: RpcRequest<unknown>) {
    return this.queries.listProducts(adminProductListQuerySchema.parse(req.data));
  }

  @MessagePattern(P.getProduct)
  getProduct(@Payload() req: RpcRequest<{ productId: string }>) {
    return this.queries.getProduct(z.uuid().parse(req.data.productId));
  }

  @MessagePattern(P.archiveProduct)
  archiveProduct(@Payload() req: RpcRequest<{ productId: string }>) {
    return this.admin.archiveProduct(req.data);
  }

  @MessagePattern(P.removeMedia)
  removeMedia(@Payload() req: RpcRequest<{ mediaId: string }>) {
    return this.admin.removeMedia(req.data);
  }
}
