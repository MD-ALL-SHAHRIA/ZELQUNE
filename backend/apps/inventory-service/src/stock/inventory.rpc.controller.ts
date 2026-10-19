import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type AdjustStockInput,
  type ReleaseStockRequest,
  type ReservationView,
  type ReserveStockRequest,
  RPC_PATTERNS,
  type RpcRequest,
  type StockLevels,
  stockLevelsRequestSchema,
} from '@zelqune/contracts';
import { InventoryService } from './inventory.service';

const P = RPC_PATTERNS.inventory;

@Controller()
export class InventoryRpcController {
  constructor(private readonly inventory: InventoryService) {}

  @MessagePattern(P.reserve)
  reserve(@Payload() req: RpcRequest<ReserveStockRequest>): Promise<ReservationView> {
    return this.inventory.reserve(req.data);
  }

  @MessagePattern(P.release)
  release(@Payload() req: RpcRequest<ReleaseStockRequest>): Promise<{ released: boolean }> {
    return this.inventory.release(req.data);
  }

  @MessagePattern(P.levels)
  levels(@Payload() req: RpcRequest<unknown>): Promise<StockLevels> {
    return this.inventory.levels(stockLevelsRequestSchema.parse(req.data).variantIds);
  }

  @MessagePattern(P.admin.adjust)
  adjust(@Payload() req: RpcRequest<AdjustStockInput>) {
    return this.inventory.adjust(req.data);
  }
}
