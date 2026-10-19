import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { APP_CONFIG, AppError } from '@zelqune/common';
import { type Request } from 'express';
import { type GatewayEnv } from '../config/gateway-env';

export const TURNSTILE_HEADER = 'cf-turnstile-response';
export const TURNSTILE_VERIFIER = Symbol('TURNSTILE_VERIFIER');

export interface TurnstileVerifier {
  verify(token: string, remoteIp: string | undefined): Promise<boolean>;
}

/** Cloudflare Turnstile siteverify (configured by env only; no account needed for the code). */
export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  constructor(
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(token: string, remoteIp: string | undefined): Promise<boolean> {
    const body = new URLSearchParams({
      secret: this.secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    });
    const res = await this.fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  }
}

/** Dev/test verifier: any non-empty token passes, except tokens starting with "fail". */
export class FakeTurnstileVerifier implements TurnstileVerifier {
  verify(token: string): Promise<boolean> {
    return Promise.resolve(token.length > 0 && !token.startsWith('fail'));
  }
}

export const turnstileVerifierProvider = {
  provide: TURNSTILE_VERIFIER,
  inject: [APP_CONFIG],
  useFactory: (config: GatewayEnv): TurnstileVerifier =>
    config.TURNSTILE_DRIVER === 'cloudflare'
      ? new CloudflareTurnstileVerifier(config.TURNSTILE_SECRET_KEY ?? '')
      : new FakeTurnstileVerifier(),
};

@Injectable()
export class TurnstileGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(TurnstileGuard.name);

  constructor(
    @Inject(TURNSTILE_VERIFIER) private readonly verifier: TurnstileVerifier,
    @Inject(APP_CONFIG) private readonly config: GatewayEnv,
  ) {}

  onModuleInit(): void {
    if (this.config.TURNSTILE_DRIVER === 'fake') {
      this.logger.warn(
        'Turnstile is using the FAKE verifier; set TURNSTILE_DRIVER=cloudflare in production',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.header(TURNSTILE_HEADER);
    if (!token || token.length > 2048)
      throw new AppError('TURNSTILE_REQUIRED', 'Please complete the bot check', 403);
    let ok = false;
    try {
      ok = await this.verifier.verify(token, req.ip);
    } catch (err) {
      this.logger.error({ err }, 'Turnstile verification failed to run');
      throw new AppError('TURNSTILE_UNAVAILABLE', 'Bot check unavailable, please try again', 503);
    }
    if (!ok) throw new AppError('TURNSTILE_FAILED', 'Bot check failed, please try again', 403);
    return true;
  }
}

/** Requires a valid Turnstile token in the cf-turnstile-response header. */
export const RequireTurnstile = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    UseGuards(TurnstileGuard),
    ApiHeader({
      name: TURNSTILE_HEADER,
      required: true,
      description: 'Cloudflare Turnstile token',
    }),
  );
