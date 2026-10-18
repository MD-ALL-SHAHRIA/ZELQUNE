import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CreateCategoryInput,
  type CreateProductInput,
  type RequestMediaUploadInput,
  RPC_PATTERNS,
  type RpcRequest,
  type SetBasePriceInput,
  type SetExperimentPriceInput,
  type UpdateProductInput,
  type UpsertVariantInput,
} from '@zelqune/contracts';
import { CatalogAdminService } from './catalog-admin.service';

const P = RPC_PATTERNS.catalog.admin;

/** Internal only: the gateway will expose these behind OWNER/STAFF routes in step 1.3. */
@Controller()
export class CatalogAdminRpcController {
  constructor(private readonly admin: CatalogAdminService) {}

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
}
