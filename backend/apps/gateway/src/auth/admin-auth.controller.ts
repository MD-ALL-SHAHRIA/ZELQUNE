import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_CONFIG, AppError, Public, ZodResponse } from '@zelqune/common';
import {
  type AccessTokenResponse,
  type AuthUser,
  RPC_PATTERNS,
  type SessionTokens,
} from '@zelqune/contracts';
import { type Request, type Response } from 'express';
import { type GatewayEnv } from '../config/gateway-env';
import { ServiceRegistry } from '../services/service-registry';
import { LoginThrottle } from '../throttling/throttling.module';
import { AccessTokenResponseDto, AdminLoginDto, AuthUserDto } from './admin-auth.dto';
import { type AuthenticatedUser } from './auth.types';
import { CurrentUser, Roles } from './guards';
import { LoginAttemptsService } from './login-attempts.service';
import {
  assertAllowedOrigin,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

function toResponse(tokens: SessionTokens): AccessTokenResponse {
  return {
    accessToken: tokens.accessToken,
    tokenType: 'Bearer',
    expiresIn: tokens.expiresIn,
    user: tokens.user,
  };
}

@ApiTags('admin auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly services: ServiceRegistry,
    private readonly attempts: LoginAttemptsService,
    @Inject(APP_CONFIG) private readonly config: GatewayEnv,
  ) {}

  @Public()
  @LoginThrottle()
  @Post('login')
  @ApiOperation({ summary: 'Admin sign-in (OWNER/STAFF). Sets the refresh cookie.' })
  @ZodResponse({ status: 200, type: AccessTokenResponseDto })
  async login(
    @Body() body: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    await this.attempts.assertNotLocked(body.phone);
    let tokens: SessionTokens;
    try {
      tokens = await this.services
        .get('identity')
        .send<SessionTokens>(RPC_PATTERNS.identity.login, {
          phone: body.phone,
          password: body.password,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        });
    } catch (err) {
      if (err instanceof AppError && err.code === 'INVALID_CREDENTIALS') {
        await this.attempts.recordFailure(body.phone);
      }
      throw err;
    }
    await this.attempts.reset(body.phone);
    setRefreshCookie(res, this.config, tokens.refreshToken, new Date(tokens.refreshExpiresAt));
    return toResponse(tokens);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh cookie and get a new access token.' })
  @ZodResponse({ status: 200, type: AccessTokenResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    assertAllowedOrigin(req, this.config.CORS_ORIGINS);
    const refreshToken = readRefreshCookie(req, this.config);
    if (!refreshToken) throw new AppError('INVALID_REFRESH_TOKEN', 'No session', 401);
    try {
      const tokens = await this.services
        .get('identity')
        .send<SessionTokens>(RPC_PATTERNS.identity.refresh, {
          refreshToken,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        });
      setRefreshCookie(res, this.config, tokens.refreshToken, new Date(tokens.refreshExpiresAt));
      return toResponse(tokens);
    } catch (err) {
      if (err instanceof AppError && err.status === 401) clearRefreshCookie(res, this.config);
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'End the session (revokes all tokens of this login) and clear the cookie.',
  })
  @ApiNoContentResponse()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertAllowedOrigin(req, this.config.CORS_ORIGINS);
    const refreshToken = readRefreshCookie(req, this.config);
    if (refreshToken) {
      await this.services.get('identity').send(RPC_PATTERNS.identity.logout, { refreshToken });
    }
    clearRefreshCookie(res, this.config);
  }

  @Get('me')
  @Roles('OWNER', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in admin.' })
  @ZodResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.services
      .get('identity')
      .send<AuthUser>(RPC_PATTERNS.identity.me, { userId: user.id });
  }
}
