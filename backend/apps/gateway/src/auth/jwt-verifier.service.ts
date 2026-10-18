import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import { ROLES, type Role } from '@zelqune/contracts';
import { importSPKI, jwtVerify, type KeyLike } from 'jose';
import { type GatewayEnv } from '../config/gateway-env';
import { type AuthenticatedUser } from './auth.types';

/** Verifies ES256 access tokens locally with identity-service's public key (no RPC per request). */
@Injectable()
export class JwtVerifierService implements OnModuleInit {
  private publicKey?: KeyLike;

  constructor(@Inject(APP_CONFIG) private readonly config: GatewayEnv) {}

  async onModuleInit(): Promise<void> {
    this.publicKey = await importSPKI(this.config.JWT_PUBLIC_KEY, 'ES256');
  }

  /** Throws on any invalid, expired, wrongly-signed or non-access token. */
  async verify(token: string): Promise<AuthenticatedUser> {
    if (!this.publicKey) throw new Error('JwtVerifierService used before init');
    const { payload } = await jwtVerify(token, this.publicKey, {
      algorithms: ['ES256'],
      issuer: this.config.JWT_ISSUER,
      audience: this.config.JWT_AUDIENCE,
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    const role = payload.role as Role;
    if (payload.typ !== 'access' || typeof payload.sub !== 'string' || !ROLES.includes(role)) {
      throw new Error('Not an access token');
    }
    return { id: payload.sub, role };
  }
}
