import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type ConfirmCodInput,
  type CreatePaymentRequest,
  type PaymentInstructions,
  type PaymentSummary,
  RPC_PATTERNS,
  type RpcRequest,
  type VerifyPaymentInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { PaymentService } from './payment.service';

const P = RPC_PATTERNS.payment;
const byOrder = z.object({ orderId: z.uuid() });

@Controller()
export class PaymentRpcController {
  constructor(private readonly payments: PaymentService) {}

  @MessagePattern(P.create)
  create(@Payload() req: RpcRequest<CreatePaymentRequest>): Promise<PaymentSummary> {
    return this.payments.create(req.data);
  }

  @MessagePattern(P.void)
  void(
    @Payload() req: RpcRequest<{ orderId: string; reason: string }>,
  ): Promise<{ voided: boolean }> {
    return this.payments.voidForOrder(req.data);
  }

  @MessagePattern(P.summaryByOrder)
  summary(@Payload() req: RpcRequest<unknown>): Promise<PaymentSummary | null> {
    return this.payments.summaryByOrder(byOrder.parse(req.data).orderId);
  }

  @MessagePattern(P.instructions)
  instructions(): Promise<PaymentInstructions> {
    return this.payments.instructions();
  }

  @MessagePattern(P.admin.verify)
  verify(@Payload() req: RpcRequest<VerifyPaymentInput>): Promise<PaymentSummary> {
    return this.payments.verify(req.data);
  }

  @MessagePattern(P.admin.reject)
  reject(
    @Payload() req: RpcRequest<{ paymentId: string; rejectedBy: string; reason: string }>,
  ): Promise<PaymentSummary> {
    return this.payments.reject(req.data);
  }

  @MessagePattern(P.admin.confirmCod)
  confirmCod(@Payload() req: RpcRequest<ConfirmCodInput>): Promise<PaymentSummary> {
    return this.payments.confirmCod(req.data);
  }
}
