import { Injectable } from '@nestjs/common';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type UserRecord } from '../users/user.repository';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

export type RevokeReason = 'ROTATED' | 'LOGOUT' | 'REUSE_DETECTED';

/** Storage operations used by AuthService; `transaction` scopes them to one DB transaction. */
export interface RefreshTokenStore {
  findByHash(tokenHash: string): Promise<(RefreshTokenRecord & { user: UserRecord }) | null>;
  create(token: NewRefreshToken): Promise<void>;
  /** Revokes one active token, linking its successor. Returns false if it was already revoked. */
  markRotated(id: string, replacedById: string, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, reason: RevokeReason, at: Date): Promise<number>;
  transaction<T>(fn: (store: RefreshTokenStore) => Promise<T>): Promise<T>;
}

class PrismaRefreshTokenStore implements RefreshTokenStore {
  constructor(
    private readonly db: Prisma.TransactionClient,
    private readonly root?: PrismaService,
  ) {}

  findByHash(tokenHash: string) {
    return this.db.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  }

  async create(token: NewRefreshToken): Promise<void> {
    await this.db.refreshToken.create({ data: token });
  }

  async markRotated(id: string, replacedById: string, at: Date): Promise<boolean> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at, revokedReason: 'ROTATED', replacedById },
    });
    return count === 1;
  }

  async revokeFamily(familyId: string, reason: RevokeReason, at: Date): Promise<number> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at, revokedReason: reason },
    });
    return count;
  }

  transaction<T>(fn: (store: RefreshTokenStore) => Promise<T>): Promise<T> {
    if (!this.root) return fn(this);
    return this.root.$transaction((tx) => fn(new PrismaRefreshTokenStore(tx)));
  }
}

@Injectable()
export class RefreshTokenRepository extends PrismaRefreshTokenStore {
  constructor(prisma: PrismaService) {
    super(prisma, prisma);
  }
}
