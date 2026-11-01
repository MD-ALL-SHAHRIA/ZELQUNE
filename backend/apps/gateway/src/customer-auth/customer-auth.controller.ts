import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  APP_CONFIG,
  AppError,
  createZodDto,
  Public,
  ServiceRegistry,
  ZodResponse,
} from '@zelqune/common';
import {
  acceptedSchema,
  accessTokenResponseSchema,
  type AccessTokenResponse,
  type AuthMail,
  type AuthMailResult,
  completeSignupSchema,
  type Customer,
  customerChangePasswordSchema,
  customerLoginSchema,
  customerProfileSchema,
  customerRegisterSchema,
  customerResetPasswordSchema,
  customerSchema,
  customerSessionListSchema,
  emailOnlySchema,
  oauthProviderSchema,
  type PendingSignup,
  RPC_PATTERNS,
  type SessionTokens,
  tokenOnlySchema,
} from '@zelqune/contracts';
import { type CookieOptions, type Request, type Response } from 'express';
import { type Redis } from 'ioredis';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/guards';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { assertAllowedOrigin } from '../auth/refresh-cookie';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';
import { RouteThrottle } from '../throttling/throttling.module';
import { RequireTurnstile } from '../turnstile/turnstile';
import { OAuthService } from './oauth.service';

class RegisterDto extends createZodDto(customerRegisterSchema) {}
class LoginDto extends createZodDto(customerLoginSchema) {}
class EmailDto extends createZodDto(emailOnlySchema) {}
class TokenDto extends createZodDto(tokenOnlySchema) {}
class ResetDto extends createZodDto(customerResetPasswordSchema) {}
class ChangePasswordDto extends createZodDto(customerChangePasswordSchema) {}
class ProfileDto extends createZodDto(customerProfileSchema) {}
class CompleteSignupDto extends createZodDto(completeSignupSchema) {}
class AcceptedDto extends createZodDto(acceptedSchema) {}
class CustomerTokenDto extends createZodDto(accessTokenResponseSchema) {}
class CustomerDto extends createZodDto(customerSchema) {}
class SessionListDto extends createZodDto(customerSessionListSchema) {}
class ProvidersDto extends createZodDto(z.object({ providers: z.array(oauthProviderSchema) })) {}
class PendingDto extends createZodDto(
  z.object({ email: z.string(), name: z.string().nullable(), provider: oauthProviderSchema }),
) {}
class OkDto extends createZodDto(z.object({ ok: z.literal(true) })) {}

const AUTH_PATH = '/v1/auth';
const OAUTH_PATH = '/v1/auth/oauth';
const BROWSER_COOKIE = 'zq_ob';
const PENDING_COOKIE = 'zq_ps';
const PENDING_TTL_SECONDS = 900;
const langOf = (v: unknown): 'en' | 'bn' => (v === 'bn' ? 'bn' : 'en');
/** Only same-site paths: never an open redirect. */
const safeReturn = (v: unknown, lang: string): string =>
  typeof v === 'string' && /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) && v.length < 200
    ? v
    : `/${lang}/account`;

/**
 * Customer accounts (ADR 0021): /v1/auth. The refresh token lives in an HttpOnly cookie that
 * only /v1/auth receives (SameSite=Strict, origin-checked); the access token is short-lived and
 * kept in memory by the storefront. Account emails are sent after the response is decided, so
 * timing does not reveal whether an address is known.
 */
@ApiTags('customer auth')
@Controller('auth')
export class CustomerAuthController {
  private readonly logger = new Logger(CustomerAuthController.name);

  constructor(
    private readonly services: ServiceRegistry,
    private readonly attempts: LoginAttemptsService,
    private readonly oauth: OAuthService,
    @Inject(APP_CONFIG) private readonly config: GatewayEnv,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private identity<T>(pattern: string, data: unknown): Promise<T> {
    return this.services.get('identity').send<T>(pattern, data);
  }

  private meta(req: Request) {
    return { userAgent: req.headers['user-agent']?.slice(0, 512), ip: req.ip };
  }

  private cookie(path: string, extra: CookieOptions = {}): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'strict',
      path,
      ...(this.config.COOKIE_DOMAIN ? { domain: this.config.COOKIE_DOMAIN } : {}),
      ...extra,
    };
  }

  private session(res: Response, tokens: SessionTokens): AccessTokenResponse {
    res.cookie(this.config.CUSTOMER_REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.cookie(AUTH_PATH),
      expires: new Date(tokens.refreshExpiresAt),
    });
    return {
      accessToken: tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: tokens.user,
    };
  }

  private refreshCookie(req: Request): string | undefined {
    const v = (req.cookies as Record<string, unknown> | undefined)?.[
      this.config.CUSTOMER_REFRESH_COOKIE_NAME
    ];
    return typeof v === 'string' && v.length > 0 && v.length <= 256 ? v : undefined;
  }

  /** Fire and forget: the reply never waits on the email (no timing difference). */
  private mail(mail: AuthMail | null): void {
    if (!mail) return;
    void this.services
      .get('notification')
      .send(RPC_PATTERNS.notification.sendAuthEmail, mail)
      .catch(() => this.logger.warn(`Account email (${mail.kind}) could not be sent`));
  }

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Which social sign-in options are switched on.' })
  @ZodResponse({ type: ProvidersDto })
  providers() {
    return { providers: this.oauth.enabled() };
  }

  @Public()
  @Post('register')
  @HttpCode(202)
  @RouteThrottle('accountEmail')
  @RequireTurnstile()
  @ApiOperation({ summary: 'Create an account; a confirmation link goes to the email.' })
  @ZodResponse({ status: 202, type: AcceptedDto })
  async register(@Body() body: RegisterDto) {
    const { mail } = await this.identity<AuthMailResult>(RPC_PATTERNS.identity.customer.register, {
      input: body,
    });
    this.mail(mail);
    return { accepted: true as const };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RouteThrottle('login')
  @ApiOperation({ summary: 'Sign in with email and password. Sets the session cookie.' })
  @ZodResponse({ status: 200, type: CustomerTokenDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = `customer:${body.email}`;
    await this.attempts.assertNotLocked(key);
    try {
      const tokens = await this.identity<SessionTokens>(RPC_PATTERNS.identity.customer.login, {
        input: body,
        meta: this.meta(req),
      });
      await this.attempts.reset(key);
      return this.session(res, tokens);
    } catch (err) {
      if (err instanceof AppError && err.code === 'INVALID_CREDENTIALS')
        await this.attempts.recordFailure(key);
      throw err;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the session cookie and get a new access token.' })
  @ZodResponse({ status: 200, type: CustomerTokenDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertAllowedOrigin(req, this.config.CORS_ORIGINS);
    const refreshToken = this.refreshCookie(req);
    if (!refreshToken) throw new AppError('INVALID_REFRESH_TOKEN', 'No session', 401);
    try {
      const tokens = await this.identity<SessionTokens>(RPC_PATTERNS.identity.customer.refresh, {
        refreshToken,
        meta: this.meta(req),
      });
      return this.session(res, tokens);
    } catch (err) {
      if (err instanceof AppError && err.status === 401)
        res.clearCookie(this.config.CUSTOMER_REFRESH_COOKIE_NAME, this.cookie(AUTH_PATH));
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Sign out this device.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertAllowedOrigin(req, this.config.CORS_ORIGINS);
    const refreshToken = this.refreshCookie(req);
    if (refreshToken) await this.identity(RPC_PATTERNS.identity.logout, { refreshToken });
    res.clearCookie(this.config.CUSTOMER_REFRESH_COOKIE_NAME, this.cookie(AUTH_PATH));
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @RouteThrottle('track')
  @ApiOperation({ summary: 'Confirm the email with the link token, and sign in.' })
  @ZodResponse({ status: 200, type: CustomerTokenDto })
  async verifyEmail(
    @Body() body: TokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.identity<SessionTokens>(RPC_PATTERNS.identity.customer.verifyEmail, {
      input: body,
      meta: this.meta(req),
    });
    return this.session(res, tokens);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(202)
  @RouteThrottle('accountEmail')
  @ZodResponse({ status: 202, type: AcceptedDto })
  async resend(@Body() body: EmailDto) {
    const { mail } = await this.identity<AuthMailResult>(
      RPC_PATTERNS.identity.customer.resendVerification,
      { input: body },
    );
    this.mail(mail);
    return { accepted: true as const };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @RouteThrottle('accountEmail')
  @RequireTurnstile()
  @ZodResponse({ status: 202, type: AcceptedDto })
  async forgot(@Body() body: EmailDto) {
    const { mail } = await this.identity<AuthMailResult>(
      RPC_PATTERNS.identity.customer.forgotPassword,
      { input: body },
    );
    this.mail(mail);
    return { accepted: true as const };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @RouteThrottle('track')
  @ZodResponse({ status: 200, type: OkDto })
  reset(@Body() body: ResetDto) {
    return this.identity<{ ok: true }>(RPC_PATTERNS.identity.customer.resetPassword, {
      input: body,
    });
  }

  /* ---------------------------------- Google / Facebook ---------------------------------- */

  @Public()
  @Get('oauth/:provider/start')
  @RouteThrottle('login')
  @ApiExcludeEndpoint()
  async oauthStart(
    @Param('provider') provider: string,
    @Query('returnTo') returnTo: unknown,
    @Query('lang') lang: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const l = langOf(lang);
    try {
      const p = oauthProviderSchema.parse(provider.toUpperCase());
      const { url, browser } = await this.oauth.start(p, safeReturn(returnTo, l), l);
      // Lax: the provider sends the browser back with a cross-site top-level GET.
      res.cookie(
        BROWSER_COOKIE,
        browser,
        this.cookie(OAUTH_PATH, { sameSite: 'lax', maxAge: 600_000 }),
      );
      res.redirect(303, url);
    } catch (err) {
      const code = err instanceof AppError ? err.code : 'OAUTH_FAILED';
      const site = this.config.STOREFRONT_URL.replace(/\/$/, '');
      res.redirect(303, `${site}/${l}/account/login?error=${encodeURIComponent(code)}`);
    }
  }

  @Public()
  @Get('oauth/:provider/callback')
  @ApiExcludeEndpoint()
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('state') state: unknown,
    @Query('code') code: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const site = this.config.STOREFRONT_URL.replace(/\/$/, '');
    const browser = (req.cookies as Record<string, string | undefined>)[BROWSER_COOKIE];
    res.clearCookie(BROWSER_COOKIE, this.cookie(OAUTH_PATH, { sameSite: 'lax' }));
    let lang: 'en' | 'bn' = 'en';
    try {
      const p = oauthProviderSchema.parse(provider.toUpperCase());
      if (typeof state !== 'string' || typeof code !== 'string')
        throw new AppError('OAUTH_CANCELLED', 'Sign-in was cancelled', 400);
      const done = await this.oauth.finish(p, state, code, browser);
      lang = done.lang;
      const next = encodeURIComponent(done.returnTo);
      const outcome = await this.identity<
        { kind: 'session'; tokens: SessionTokens } | { kind: 'pending'; profile: PendingSignup }
      >(RPC_PATTERNS.identity.customer.oauth, { profile: done.profile, meta: this.meta(req) });
      if (outcome.kind === 'session') {
        this.session(res, outcome.tokens);
        return res.redirect(303, `${site}/${lang}/account/signed-in?next=${next}`);
      }
      const id = randomBytes(32).toString('base64url');
      await this.redis.set(
        `oauth:pending:${id}`,
        JSON.stringify(outcome.profile),
        'EX',
        PENDING_TTL_SECONDS,
      );
      res.cookie(
        PENDING_COOKIE,
        id,
        this.cookie(OAUTH_PATH, { sameSite: 'lax', maxAge: PENDING_TTL_SECONDS * 1000 }),
      );
      return res.redirect(303, `${site}/${lang}/account/complete?next=${next}`);
    } catch (err) {
      const code = err instanceof AppError ? err.code : 'OAUTH_FAILED';
      return res.redirect(303, `${site}/${lang}/account/login?error=${encodeURIComponent(code)}`);
    }
  }

  private async pending(req: Request): Promise<{ id: string; profile: PendingSignup }> {
    const id = (req.cookies as Record<string, string | undefined>)[PENDING_COOKIE];
    const raw = id && id.length < 100 ? await this.redis.get(`oauth:pending:${id}`) : null;
    if (!id || !raw) throw new AppError('OAUTH_STATE', 'Sign-in expired. Please start again.', 400);
    return { id, profile: JSON.parse(raw) as PendingSignup };
  }

  @Public()
  @Get('oauth/pending')
  @ApiOperation({ summary: 'The Google/Facebook details waiting for name and phone.' })
  @ZodResponse({ type: PendingDto })
  async pendingProfile(@Req() req: Request) {
    const { profile } = await this.pending(req);
    return { email: profile.email, name: profile.name, provider: profile.provider };
  }

  @Public()
  @Post('oauth/complete')
  @HttpCode(200)
  @RouteThrottle('login')
  @ApiOperation({
    summary: 'First Google/Facebook sign-in: add name and phone, create the account.',
  })
  @ZodResponse({ status: 200, type: CustomerTokenDto })
  async complete(
    @Body() body: CompleteSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertAllowedOrigin(req, this.config.CORS_ORIGINS);
    const { id, profile } = await this.pending(req);
    const tokens = await this.identity<SessionTokens>(RPC_PATTERNS.identity.customer.oauth, {
      pending: profile,
      input: body,
      meta: this.meta(req),
    });
    await this.redis.del(`oauth:pending:${id}`);
    res.clearCookie(PENDING_COOKIE, this.cookie(OAUTH_PATH, { sameSite: 'lax' }));
    return this.session(res, tokens);
  }

  /* ---------------------------------- Signed-in customer --------------------------------- */

  @Get('me')
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ZodResponse({ type: CustomerDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.identity<Customer>(RPC_PATTERNS.identity.customer.me, { userId: user.id });
  }

  @Put('me')
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ZodResponse({ type: CustomerDto })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: ProfileDto) {
    return this.identity<Customer>(RPC_PATTERNS.identity.customer.updateProfile, {
      userId: user.id,
      input: body,
    });
  }

  @Post('change-password')
  @HttpCode(200)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @RouteThrottle('login')
  @ZodResponse({ status: 200, type: OkDto })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return this.identity<{ ok: true }>(RPC_PATTERNS.identity.customer.changePassword, {
      userId: user.id,
      input: body,
      refreshToken: this.refreshCookie(req),
    });
  }

  @Get('sessions')
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ZodResponse({ type: SessionListDto })
  sessions(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.identity<z.infer<typeof customerSessionListSchema>>(
      RPC_PATTERNS.identity.customer.sessions,
      {
        userId: user.id,
        refreshToken: this.refreshCookie(req),
      },
    );
  }

  @Delete('sessions/:id')
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ZodResponse({ type: OkDto })
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const sessionId = z.uuid().parse(id);
    return this.identity<{ ok: true }>(RPC_PATTERNS.identity.customer.revokeSession, {
      userId: user.id,
      input: { sessionId },
    });
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ZodResponse({ status: 200, type: OkDto })
  revokeOthers(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.identity<{ ok: true }>(RPC_PATTERNS.identity.customer.revokeOthers, {
      userId: user.id,
      refreshToken: this.refreshCookie(req),
    });
  }
}
