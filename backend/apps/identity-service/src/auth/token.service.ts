import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import { type Role } from '@zelqune/contracts';
import { importPKCS8, type KeyLike, SignJWT } from 'jose';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { type IdentityEnv } from '../config/identity-env';

export const JWT_ALG = 'ES256';

export interface IssuedAccessToken {
  token: string;
  expiresIn: number;
}

@Injectable()
export class TokenService implements OnModuleInit {
  private privateKey?: KeyLike;

  constructor(@Inject(APP_CONFIG) private readonly config: IdentityEnv) {}

  async onModuleInit(): Promise<void> {
    this.privateKey = await importPKCS8(this.config.JWT_PRIVATE_KEY, JWT_ALG);
  }

  async issueAccessToken(user: { id: string; role: Role }): Promise<IssuedAccessToken> {
    if (!this.privateKey) throw new Error('TokenService used before init');
    const expiresIn = this.config.ACCESS_TOKEN_TTL_SECONDS;
    const token = await new SignJWT({ role: user.role, typ: 'access' })
      .setProtectedHeader({ alg: JWT_ALG, typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.config.JWT_ISSUER)
      .setAudience(this.config.JWT_AUDIENCE)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`)
      .sign(this.privateKey);
    return { token, expiresIn };
  }

  /** 256-bit opaque refresh token (base64url). Never stored; only its hash is. */
  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshExpiry(from = new Date()): Date {
    return new Date(from.getTime() + this.config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
