import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, AppError } from '@zelqune/common';
import { type OAuthProfile, type OAuthProvider } from '@zelqune/contracts';
import { type Redis } from 'ioredis';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';

const STATE_TTL_SECONDS = 600;
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const FB = 'https://graph.facebook.com/v21.0';
const b64url = (b: Buffer) => b.toString('base64url');

interface StoredState {
  provider: OAuthProvider;
  verifier: string;
  nonce: string;
  browser: string;
  returnTo: string;
  lang: 'en' | 'bn';
}

/**
 * Google (OpenID Connect) and Facebook sign-in with the authorization code flow (ADR 0021):
 * PKCE (S256), a one-time `state` kept in Redis and bound to this browser by a cookie, a `nonce`
 * checked in Google's signed ID token, and the code exchanged server to server (the client
 * secret never leaves the gateway). Facebook calls carry an appsecret_proof.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: GatewayEnv,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  enabled(): OAuthProvider[] {
    const c = this.config;
    return [
      ...(c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET ? (['GOOGLE'] as const) : []),
      ...(c.FACEBOOK_APP_ID && c.FACEBOOK_APP_SECRET ? (['FACEBOOK'] as const) : []),
    ];
  }

  private redirectUri(provider: OAuthProvider): string {
    return `${this.config.PUBLIC_API_URL}/v1/auth/oauth/${provider.toLowerCase()}/callback`;
  }

  /** The provider URL to send the browser to, plus the value of the browser-binding cookie. */
  async start(
    provider: OAuthProvider,
    returnTo: string,
    lang: 'en' | 'bn',
  ): Promise<{ url: string; browser: string }> {
    if (!this.enabled().includes(provider))
      throw new AppError('OAUTH_DISABLED', 'This sign-in option is not available', 404);
    const state = b64url(randomBytes(32));
    const verifier = b64url(randomBytes(48));
    const nonce = b64url(randomBytes(24));
    const browser = b64url(randomBytes(24));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    const stored: StoredState = { provider, verifier, nonce, browser, returnTo, lang };
    await this.redis.set(`oauth:state:${state}`, JSON.stringify(stored), 'EX', STATE_TTL_SECONDS);
    const params = new URLSearchParams({
      redirect_uri: this.redirectUri(provider),
      response_type: 'code',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    if (provider === 'GOOGLE') {
      params.set('client_id', this.config.GOOGLE_CLIENT_ID!);
      params.set('scope', 'openid email profile');
      params.set('nonce', nonce);
      params.set('prompt', 'select_account');
      return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, browser };
    }
    params.set('client_id', this.config.FACEBOOK_APP_ID!);
    params.set('scope', 'email,public_profile');
    return { url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`, browser };
  }

  /** Checks the state (once only, same browser) and turns the code into a verified profile. */
  async finish(
    provider: OAuthProvider,
    state: string,
    code: string,
    browser: string | undefined,
  ): Promise<{ profile: OAuthProfile; returnTo: string; lang: 'en' | 'bn' }> {
    const key = `oauth:state:${state.slice(0, 100)}`;
    const raw = await this.redis.getdel(key);
    const stored = raw ? (JSON.parse(raw) as StoredState) : null;
    if (!stored || stored.provider !== provider || !browser || stored.browser !== browser)
      throw new AppError(
        'OAUTH_STATE',
        'Sign-in expired or was started elsewhere. Please try again.',
        400,
      );
    const profile =
      provider === 'GOOGLE' ? await this.google(code, stored) : await this.facebook(code, stored);
    return { profile, returnTo: stored.returnTo, lang: stored.lang };
  }

  private async google(code: string, s: StoredState): Promise<OAuthProfile> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.GOOGLE_CLIENT_ID!,
        client_secret: this.config.GOOGLE_CLIENT_SECRET!,
        redirect_uri: this.redirectUri('GOOGLE'),
        grant_type: 'authorization_code',
        code_verifier: s.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id_token?: string };
    if (!res.ok || !body.id_token) throw this.failed('google token exchange', res.status);
    const { payload } = await jwtVerify(body.id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: this.config.GOOGLE_CLIENT_ID!,
    }).catch(() => {
      throw this.failed('google id token', 0);
    });
    if (payload.nonce !== s.nonce || typeof payload.sub !== 'string')
      throw this.failed('google nonce', 0);
    return {
      provider: 'GOOGLE',
      providerUserId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  }

  private async facebook(code: string, s: StoredState): Promise<OAuthProfile> {
    const token = await fetch(
      `${FB}/oauth/access_token?${new URLSearchParams({
        client_id: this.config.FACEBOOK_APP_ID!,
        client_secret: this.config.FACEBOOK_APP_SECRET!,
        redirect_uri: this.redirectUri('FACEBOOK'),
        code,
        code_verifier: s.verifier,
      }).toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const t = (await token.json().catch(() => ({}))) as { access_token?: string };
    if (!token.ok || !t.access_token) throw this.failed('facebook token exchange', token.status);
    const proof = createHmac('sha256', this.config.FACEBOOK_APP_SECRET!)
      .update(t.access_token)
      .digest('hex');
    const me = await fetch(
      `${FB}/me?${new URLSearchParams({ fields: 'id,name,email', access_token: t.access_token, appsecret_proof: proof }).toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const p = (await me.json().catch(() => ({}))) as { id?: string; name?: string; email?: string };
    if (!me.ok || !p.id) throw this.failed('facebook profile', me.status);
    return {
      provider: 'FACEBOOK',
      providerUserId: p.id,
      email: p.email ?? null,
      // Facebook only returns an email the person has confirmed with Facebook.
      emailVerified: !!p.email,
      name: p.name ?? null,
    };
  }

  private failed(step: string, status: number): AppError {
    this.logger.warn(`OAuth step failed: ${step} (${status})`);
    return new AppError(
      'OAUTH_FAILED',
      'Sign-in with this provider failed. Please try again.',
      502,
    );
  }
}
