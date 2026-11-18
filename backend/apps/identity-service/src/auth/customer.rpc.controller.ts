import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type OAuthProfile,
  type PendingSignup,
  RPC_PATTERNS,
  type RpcRequest,
  type SessionMeta,
} from '@zelqune/contracts';
import { AddressBookService } from './address-book.service';
import { CustomerService } from './customer.service';

const P = RPC_PATTERNS.identity.customer;
type WithMeta<T = unknown> = RpcRequest<{ input?: T; meta?: SessionMeta }>;
type ForUser<T = unknown> = RpcRequest<{ userId: string; input?: T; refreshToken?: string }>;

@Controller()
export class CustomerRpcController {
  constructor(
    private readonly customers: CustomerService,
    private readonly addresses: AddressBookService,
  ) {}

  @MessagePattern(P.addresses.list)
  listAddresses(@Payload() req: ForUser) {
    return this.addresses.list(req.data.userId);
  }

  @MessagePattern(P.addresses.save)
  saveAddress(@Payload() req: RpcRequest<{ userId: string; id: string | null; input: unknown }>) {
    return this.addresses.save(req.data.userId, req.data.id, req.data.input);
  }

  @MessagePattern(P.addresses.remove)
  removeAddress(@Payload() req: RpcRequest<{ userId: string; id: string }>) {
    return this.addresses.remove(req.data.userId, req.data.id);
  }

  @MessagePattern(P.register)
  register(@Payload() req: WithMeta) {
    return this.customers.register(req.data.input);
  }

  @MessagePattern(P.login)
  login(@Payload() req: WithMeta) {
    return this.customers.login(req.data.input, req.data.meta ?? {});
  }

  @MessagePattern(P.refresh)
  refresh(@Payload() req: RpcRequest<{ refreshToken: string; meta?: SessionMeta }>) {
    return this.customers.refresh(req.data.refreshToken, req.data.meta ?? {});
  }

  @MessagePattern(P.verifyEmail)
  verifyEmail(@Payload() req: WithMeta) {
    return this.customers.verifyEmail(req.data.input, req.data.meta ?? {});
  }

  @MessagePattern(P.resendVerification)
  resend(@Payload() req: WithMeta) {
    return this.customers.resendVerification(req.data.input);
  }

  @MessagePattern(P.forgotPassword)
  forgot(@Payload() req: WithMeta) {
    return this.customers.forgotPassword(req.data.input);
  }

  @MessagePattern(P.resetPassword)
  reset(@Payload() req: WithMeta) {
    return this.customers.resetPassword(req.data.input);
  }

  @MessagePattern(P.oauth)
  oauth(
    @Payload()
    req: RpcRequest<{
      profile?: OAuthProfile;
      pending?: PendingSignup;
      input?: unknown;
      meta?: SessionMeta;
    }>,
  ) {
    const { profile, pending, input, meta = {} } = req.data;
    if (pending) return this.customers.completeSignup(pending, input, meta);
    return this.customers.oauth(profile as OAuthProfile, meta);
  }

  @MessagePattern(P.me)
  me(@Payload() req: ForUser) {
    return this.customers.me(req.data.userId);
  }

  @MessagePattern(P.updateProfile)
  updateProfile(@Payload() req: ForUser) {
    return this.customers.updateProfile(req.data.userId, req.data.input);
  }

  @MessagePattern(P.changePassword)
  changePassword(@Payload() req: ForUser) {
    return this.customers.changePassword(req.data.userId, req.data.input, req.data.refreshToken);
  }

  @MessagePattern(P.sessions)
  sessions(@Payload() req: ForUser) {
    return this.customers.sessions(req.data.userId, req.data.refreshToken);
  }

  @MessagePattern(P.revokeSession)
  revokeSession(@Payload() req: ForUser<{ sessionId: string }>) {
    return this.customers.revokeSession(req.data.userId, req.data.input?.sessionId ?? '');
  }

  @MessagePattern(P.revokeOthers)
  revokeOthers(@Payload() req: ForUser) {
    return this.customers.revokeOthers(req.data.userId, req.data.refreshToken);
  }
}
