import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type ActiveSale,
  type Promotion,
  RPC_PATTERNS,
  type RpcRequest,
  type UpsertPromotionInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { PublicCatalogService } from '../catalog/public-catalog.service';
import { PromotionService } from './promotion.service';

const C = RPC_PATTERNS.catalog;

@Controller()
export class PromotionRpcController {
  constructor(
    private readonly promotions: PromotionService,
    private readonly catalog: PublicCatalogService,
  ) {}

  @MessagePattern(C.activeSale)
  active(): Promise<ActiveSale> {
    return this.catalog.activeSale();
  }

  @MessagePattern(C.admin.listPromotions)
  list(): Promise<{ items: Promotion[] }> {
    return this.promotions.list();
  }

  @MessagePattern(C.admin.createPromotion)
  create(@Payload() req: RpcRequest<UpsertPromotionInput>): Promise<Promotion> {
    return this.promotions.create(req.data);
  }

  @MessagePattern(C.admin.updatePromotion)
  update(
    @Payload() req: RpcRequest<{ id: string; promotion: UpsertPromotionInput }>,
  ): Promise<Promotion> {
    return this.promotions.update(z.uuid().parse(req.data.id), req.data.promotion);
  }

  @MessagePattern(C.admin.removePromotion)
  remove(@Payload() req: RpcRequest<{ id: string }>): Promise<{ deleted: boolean }> {
    return this.promotions.remove(z.uuid().parse(req.data.id));
  }

  @MessagePattern(C.admin.variantCosts)
  costs(@Payload() req: RpcRequest<{ variantIds: string[] }>) {
    return this.promotions.variantCosts(z.array(z.uuid()).max(5000).parse(req.data.variantIds));
  }
}
