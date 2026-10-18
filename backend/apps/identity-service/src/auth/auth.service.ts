import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  ADMIN_ROLES,
  type AuthUser,
  type LoginRpcRequest,
  type RefreshRpcRequest,
  type SessionMeta,
  type SessionTokens,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type UserRecord, UserRepository } from '../users/user.repository';
import { PasswordService } from './password.service';
import { RefreshTokenRepository, type RefreshTokenStore } from './refresh-token.repository';
import { TokenService } from './token.service';

export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
export const INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN';
export const REFRESH_TOKEN_REUSED = 'REFRESH_TOKEN_REUSED';

export function toAuthUser(user: UserRecord): AuthUser {
  return { id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role };
}

type RefreshOutcome =
  { kind: 'rotated'; tokens: SessionTokens } | { kind: 'reused' } | { kind: 'invalid' };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepository,
    @Inject(RefreshTokenRepository) private readonly refreshTokens: RefreshTokenStore,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /** Admin password login (OWNER/STAFF). Same error for every failure reason. */
  async login({ phone, password, ...meta }: LoginRpcRequest): Promise<SessionTokens> {
    const user = await this.users.findByPhone(phone);
    const passwordOk = await this.passwords.verify(user?.passwordHash, password);

    if (!user || !passwordOk || !user.isActive || !ADMIN_ROLES.includes(user.role)) {
      throw new AppError(INVALID_CREDENTIALS, 'Invalid phone or password', 401);
    }
    if (user.passwordHash && this.passwords.needsRehash(user.passwordHash)) {
      await this.users.updatePasswordHash(user.id, await this.passwords.hash(password));
    }
    const now = new Date();
    await this.users.touchLastLogin(user.id, now);
    return this.startSession(user, randomUUID(), meta, this.refreshTokens);
  }

  /**
   * Rotates a refresh token. Presenting a token that was already rotated or revoked is treated
   * as theft: the whole family (session) is revoked and the caller must log in again.
   */
  async refresh({ refreshToken, ...meta }: RefreshRpcRequest): Promise<SessionTokens> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const now = new Date();

    // The family revocation must commit even though the request fails, so the transaction
    // returns an outcome and errors are thrown only after it completes.
    const outcome = await this.refreshTokens.transaction<RefreshOutcome>(async (store) => {
      const current = await store.findByHash(hash);
      if (!current) return { kind: 'invalid' };

      if (current.revokedAt) {
        await store.revokeFamily(current.familyId, 'REUSE_DETECTED', now);
        return { kind: 'reused' };
      }
      const { user } = current;
      if (current.expiresAt <= now || !user.isActive || !ADMIN_ROLES.includes(user.role)) {
        await store.revokeFamily(current.familyId, 'LOGOUT', now);
        return { kind: 'invalid' };
      }

      const tokens = await this.startSession(user, current.familyId, meta, store, (newId) =>
        store.markRotated(current.id, newId, now),
      );
      return { kind: 'rotated', tokens };
    });

    if (outcome.kind === 'reused') {
      this.logger.warn('Refresh token reuse detected; session family revoked');
      throw new AppError(REFRESH_TOKEN_REUSED, 'Session revoked, please sign in again', 401);
    }
    if (outcome.kind === 'invalid') {
      throw new AppError(INVALID_REFRESH_TOKEN, 'Invalid or expired session', 401);
    }
    return outcome.tokens;
  }

  /** Revokes the whole session family. Unknown tokens are ignored (logout is idempotent). */
  async logout(refreshToken: string): Promise<void> {
    const current = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(refreshToken));
    if (current) await this.refreshTokens.revokeFamily(current.familyId, 'LOGOUT', new Date());
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    return toAuthUser(user);
  }

  private async startSession(
    user: UserRecord,
    familyId: string,
    meta: SessionMeta,
    store: RefreshTokenStore,
    beforeCommit?: (newTokenId: string) => Promise<boolean>,
  ): Promise<SessionTokens> {
    const refreshToken = this.tokens.generateRefreshToken();
    const id = randomUUID();
    const expiresAt = this.tokens.refreshExpiry();
    await store.create({
      id,
      userId: user.id,
      familyId,
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 512),
      ip: meta.ip,
    });
    if (beforeCommit && !(await beforeCommit(id))) {
      // Lost a race with a concurrent rotation of the same token: abort this transaction.
      throw new AppError(INVALID_REFRESH_TOKEN, 'Invalid or expired session', 401);
    }
    const access = await this.tokens.issueAccessToken(user);
    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken,
      refreshExpiresAt: expiresAt.toISOString(),
      user: toAuthUser(user),
    };
  }
}
