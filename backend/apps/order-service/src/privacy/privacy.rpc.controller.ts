import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { privacyIdSchema, RPC_PATTERNS, type RpcRequest } from '@zelqune/contracts';
import { PrivacyService } from './privacy.service';

const P = RPC_PATTERNS.order.privacy;
type WithId = RpcRequest<{ id: string; input?: unknown }>;
const id = (req: WithId) => privacyIdSchema.parse(req.data).id;

@Controller()
export class PrivacyRpcController {
  constructor(private readonly privacy: PrivacyService) {}

  @MessagePattern(P.submit)
  submit(@Payload() req: RpcRequest<unknown>) {
    return this.privacy.submit(req.data);
  }

  @MessagePattern(P.track)
  track(@Payload() req: RpcRequest<unknown>) {
    return this.privacy.track(req.data);
  }

  @MessagePattern(P.admin.list)
  list(@Payload() req: RpcRequest<unknown>) {
    return this.privacy.list(req.data);
  }

  @MessagePattern(P.admin.get)
  get(@Payload() req: WithId) {
    return this.privacy.get(id(req));
  }

  @MessagePattern(P.admin.askVerification)
  askVerification(@Payload() req: WithId) {
    return this.privacy.askVerification(id(req), req.data.input);
  }

  @MessagePattern(P.admin.verify)
  verify(@Payload() req: WithId) {
    return this.privacy.verify(id(req), req.data.input);
  }

  @MessagePattern(P.admin.reject)
  reject(@Payload() req: WithId) {
    return this.privacy.reject(id(req), req.data.input);
  }

  @MessagePattern(P.admin.export)
  export(@Payload() req: WithId) {
    return this.privacy.export(id(req));
  }

  @MessagePattern(P.admin.correct)
  correct(@Payload() req: WithId) {
    return this.privacy.correct(id(req), req.data.input);
  }

  @MessagePattern(P.admin.erase)
  erase(@Payload() req: WithId) {
    return this.privacy.erase(id(req));
  }

  @MessagePattern(P.admin.complete)
  complete(@Payload() req: WithId) {
    return this.privacy.complete(id(req), req.data.input);
  }
}
