import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CreateShipmentInput,
  type DistrictView,
  RPC_PATTERNS,
  type RpcRequest,
  type ShipmentSummary,
  type ShippingQuote,
  type ShippingQuoteRequest,
  type UpdateShipmentStatusInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { ShippingService } from './shipping.service';

const P = RPC_PATTERNS.shipping;
const byOrder = z.object({ orderId: z.uuid() });

@Controller()
export class ShippingRpcController {
  constructor(private readonly shipping: ShippingService) {}

  @MessagePattern(P.districts)
  districts(): { items: DistrictView[] } {
    return this.shipping.districts();
  }

  @MessagePattern(P.quote)
  quote(@Payload() req: RpcRequest<ShippingQuoteRequest>): ShippingQuote {
    return this.shipping.quote(req.data);
  }

  @MessagePattern(P.shipmentByOrder)
  shipmentByOrder(@Payload() req: RpcRequest<unknown>): Promise<ShipmentSummary | null> {
    return this.shipping.shipmentByOrder(byOrder.parse(req.data).orderId);
  }

  @MessagePattern(P.admin.createShipment)
  createShipment(@Payload() req: RpcRequest<CreateShipmentInput>): Promise<ShipmentSummary> {
    return this.shipping.createShipment(req.data);
  }

  @MessagePattern(P.admin.updateStatus)
  updateStatus(@Payload() req: RpcRequest<UpdateShipmentStatusInput>): Promise<ShipmentSummary> {
    return this.shipping.updateStatus(req.data);
  }
}
