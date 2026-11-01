import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  adminQuoteListQuerySchema,
  type ConvertQuoteInput,
  type PriceQuoteInput,
  quoteTrackQuerySchema,
  type RfqRequest,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { QuoteService } from './quote.service';

const P = RPC_PATTERNS.order.quotes;

@Controller()
export class QuoteRpcController {
  constructor(private readonly quotes: QuoteService) {}

  @MessagePattern(P.request)
  request(@Payload() req: RpcRequest<{ request: RfqRequest; customerUserId?: string }>) {
    return this.quotes.request(req.data.request, req.data.customerUserId ?? null);
  }

  @MessagePattern(P.track)
  track(@Payload() req: RpcRequest<unknown>) {
    const { code, phone } = quoteTrackQuerySchema.parse(req.data);
    return this.quotes.track(code, phone);
  }

  @MessagePattern(P.admin.list)
  list(@Payload() req: RpcRequest<unknown>) {
    return this.quotes.list(adminQuoteListQuerySchema.parse(req.data ?? {}));
  }

  @MessagePattern(P.admin.get)
  get(@Payload() req: RpcRequest<{ quoteId: string }>) {
    return this.quotes.get(req.data.quoteId);
  }

  @MessagePattern(P.admin.price)
  price(@Payload() req: RpcRequest<{ quoteId: string; pricing: PriceQuoteInput }>) {
    return this.quotes.price(req.data.quoteId, req.data.pricing);
  }

  @MessagePattern(P.admin.accept)
  accept(@Payload() req: RpcRequest<{ quoteId: string }>) {
    return this.quotes.accept(req.data.quoteId);
  }

  @MessagePattern(P.admin.reject)
  reject(@Payload() req: RpcRequest<{ quoteId: string; reason?: string | null }>) {
    return this.quotes.reject(req.data.quoteId, { reason: req.data.reason ?? null });
  }

  @MessagePattern(P.admin.convert)
  convert(@Payload() req: RpcRequest<{ quoteId: string; conversion: ConvertQuoteInput }>) {
    return this.quotes.convert(req.data.quoteId, req.data.conversion);
  }
}
