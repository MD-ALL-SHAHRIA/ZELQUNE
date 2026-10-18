import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type AuthUser,
  type LoginRpcRequest,
  type LogoutRpcRequest,
  type MeRpcRequest,
  type RefreshRpcRequest,
  RPC_PATTERNS,
  type RpcRequest,
  type SessionTokens,
} from '@zelqune/contracts';
import { AuthService } from './auth.service';

@Controller()
export class AuthRpcController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(RPC_PATTERNS.identity.login)
  login(@Payload() req: RpcRequest<LoginRpcRequest>): Promise<SessionTokens> {
    return this.auth.login(req.data);
  }

  @MessagePattern(RPC_PATTERNS.identity.refresh)
  refresh(@Payload() req: RpcRequest<RefreshRpcRequest>): Promise<SessionTokens> {
    return this.auth.refresh(req.data);
  }

  @MessagePattern(RPC_PATTERNS.identity.logout)
  async logout(@Payload() req: RpcRequest<LogoutRpcRequest>): Promise<{ ok: true }> {
    await this.auth.logout(req.data.refreshToken);
    return { ok: true };
  }

  @MessagePattern(RPC_PATTERNS.identity.me)
  me(@Payload() req: RpcRequest<MeRpcRequest>): Promise<AuthUser> {
    return this.auth.me(req.data.userId);
  }
}
