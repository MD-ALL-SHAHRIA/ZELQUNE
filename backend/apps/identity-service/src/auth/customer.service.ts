import { Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  type AuthMailResult,
  type Customer,
  customerChangePasswordSchema,
  customerLoginSchema,
  customerProfileSchema,
  customerRegisterSchema,
  customerResetPasswordSchema,
  completeSignupSchema,
  emailOnlySchema,
  type OAuthProfile,
  type PendingSignup,
  type SessionMeta,
  type SessionTokens,
  tokenOnlySchema,
} from '@zelqune/contracts';
import { createHash, randomBytes } from 'node:crypto';
import { type AuthTokenPurpose, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type UserRecord } from '../users/user.repository';
import { AuthService } from './auth.service';
import { assertStrongPassword } from './password-policy';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const VERIFY_TTL_MS = 24 * 3600_000;
const RESET_TTL_MS = 30 * 60_000;
const CUSTOMER = ['CUSTOMER'] as const;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const invalidLink = () =>
  new AppError('INVALID_LINK', 'This link is invalid or has expired. Ask for a new one.', 400);

export type OAuthOutcome =
  { kind: 'session'; tokens: SessionTokens } | { kind: 'pending'; profile: PendingSignup };

/**
 * Customer accounts (ADR 0021). Public answers never reveal whether an email or phone is known:
 * register, resend and forgot all return "accepted", and the email itself tells the owner of
 * the address what happened. Links are single use; only their hash is stored.
 */
@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(raw: unknown): Promise<AuthMailResult> {
    const input = customerRegisterSchema.parse(raw);
    assertStrongPassword(input.password, [input.name, input.email, input.phone]);
    // Hash first so every branch costs the same time.
    const passwordHash = await this.passwords.hash(input.password);
    const lang = input.lang;
    const byEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (byEmail) {
      if (byEmail.role === 'CUSTOMER' && !byEmail.emailVerifiedAt) {
        // An unfinished sign-up: resend the link, never overwrite the stored password.
        return { mail: await this.verifyMail(byEmail, lang) };
      }
      return { mail: { kind: 'exists', to: input.email, name: byEmail.name ?? input.name, lang } };
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          name: input.name,
          role: 'CUSTOMER',
          passwordHash,
        },
      });
      return { mail: await this.verifyMail(user, lang) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { mail: { kind: 'phoneTaken', to: input.email, name: input.name, lang } };
      }
      throw err;
    }
  }

  async login(raw: unknown, meta: SessionMeta): Promise<SessionTokens> {
    const { email, password } = customerLoginSchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await this.passwords.verify(user?.passwordHash, password);
    if (!user || !ok || !user.isActive || user.role !== 'CUSTOMER')
      throw new AppError('INVALID_CREDENTIALS', 'Wrong email or password', 401);
    // Only someone who knows the password learns that the email is not verified yet.
    if (!user.emailVerifiedAt)
      throw new AppError(
        'EMAIL_NOT_VERIFIED',
        'Confirm your email first. We can send the link again.',
        403,
      );
    if (user.passwordHash && this.passwords.needsRehash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.passwords.hash(password) },
      });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.auth.openSession(user, meta);
  }

  refresh(refreshToken: string, meta: SessionMeta): Promise<SessionTokens> {
    return this.auth.refresh({ refreshToken, ...meta }, CUSTOMER);
  }

  /** Confirms the email and signs the person in. */
  async verifyEmail(raw: unknown, meta: SessionMeta): Promise<SessionTokens> {
    const { token } = tokenOnlySchema.parse(raw);
    const user = await this.consume(token, 'VERIFY_EMAIL', async (tx, u) => {
      await tx.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
    });
    return this.auth.openSession(user, meta);
  }

  async resendVerification(raw: unknown): Promise<AuthMailResult> {
    const { email, lang } = emailOnlySchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'CUSTOMER' || user.emailVerifiedAt || !user.isActive)
      return { mail: null };
    return { mail: await this.verifyMail(user, lang) };
  }

  async forgotPassword(raw: unknown): Promise<AuthMailResult> {
    const { email, lang } = emailOnlySchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'CUSTOMER' || !user.isActive) return { mail: null };
    const token = await this.issue(user.id, 'RESET_PASSWORD', RESET_TTL_MS);
    return { mail: { kind: 'reset', to: email, name: user.name ?? '', token, lang } };
  }

  /** New password; the link also proves the email. Every session is signed out. */
  async resetPassword(raw: unknown): Promise<{ ok: true }> {
    const { token, password } = customerResetPasswordSchema.parse(raw);
    const row = await this.prisma.authToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (row) assertStrongPassword(password, [row.user.name, row.user.email, row.user.phone]);
    const passwordHash = await this.passwords.hash(password);
    await this.consume(token, 'RESET_PASSWORD', async (tx, u) => {
      await tx.user.update({
        where: { id: u.id },
        data: { passwordHash, emailVerifiedAt: u.emailVerifiedAt ?? new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: u.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
      });
    });
    return { ok: true };
  }

  /**
   * Google/Facebook. A known provider id signs in. Otherwise a provider-verified email links to
   * the matching customer; if that account never verified its email, its password is removed and
   * its sessions ended (someone may have pre-registered the address). A new person goes to the
   * "complete sign-up" step for name and phone. Admin accounts are never linked.
   */
  async oauth(profile: OAuthProfile, meta: SessionMeta): Promise<OAuthOutcome> {
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });
    if (linked) {
      if (!linked.user.isActive || linked.user.role !== 'CUSTOMER')
        throw new AppError('INVALID_CREDENTIALS', 'This account cannot sign in here', 401);
      return { kind: 'session', tokens: await this.signIn(linked.user, meta) };
    }
    if (!profile.email || !profile.emailVerified)
      throw new AppError(
        'OAUTH_EMAIL_REQUIRED',
        'We need a verified email from your account. Please sign up with email instead.',
        400,
      );
    const email = profile.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { kind: 'pending', profile: { ...profile, email } };
    if (user.role !== 'CUSTOMER' || !user.isActive)
      throw new AppError('INVALID_CREDENTIALS', 'This account cannot sign in here', 401);
    await this.prisma.$transaction(async (tx) => {
      if (!user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date(), passwordHash: null },
        });
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
        });
      }
      await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email,
        },
      });
    });
    return { kind: 'session', tokens: await this.signIn(user, meta) };
  }

  /** First social sign-in, step two: create the account with the name and phone. */
  async completeSignup(
    pending: PendingSignup,
    raw: unknown,
    meta: SessionMeta,
  ): Promise<SessionTokens> {
    const input = completeSignupSchema.parse(raw);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: pending.email,
          emailVerifiedAt: new Date(),
          name: input.name,
          phone: input.phone,
          role: 'CUSTOMER',
          oauthAccounts: {
            create: {
              provider: pending.provider,
              providerUserId: pending.providerUserId,
              email: pending.email,
            },
          },
        },
      });
      return this.signIn(user, meta);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        throw new AppError(
          'ACCOUNT_CONFLICT',
          'This email or phone number already belongs to an account. Sign in to that account instead.',
          409,
        );
      throw err;
    }
  }

  async me(userId: string): Promise<Customer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: { select: { provider: true } } },
    });
    if (!user || !user.isActive || user.role !== 'CUSTOMER')
      throw new AppError('USER_NOT_FOUND', 'Account not found', 404);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: !!user.emailVerifiedAt,
      phone: user.phone,
      hasPassword: !!user.passwordHash,
      providers: [...new Set(user.oauthAccounts.map((a) => a.provider))],
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, raw: unknown): Promise<Customer> {
    const input = customerProfileSchema.parse(raw);
    try {
      await this.prisma.user.update({ where: { id: userId, role: 'CUSTOMER' }, data: input });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        throw new AppError('PHONE_IN_USE', 'This phone number belongs to another account', 409);
      throw err;
    }
    return this.me(userId);
  }

  /** Needs the current password when there is one; ends every other session. */
  async changePassword(
    userId: string,
    raw: unknown,
    currentRefresh?: string,
  ): Promise<{ ok: true }> {
    const input = customerChangePasswordSchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'CUSTOMER')
      throw new AppError('USER_NOT_FOUND', 'Account not found', 404);
    if (
      user.passwordHash &&
      !(await this.passwords.verify(user.passwordHash, input.currentPassword))
    )
      throw new AppError('INVALID_CREDENTIALS', 'Your current password is not right', 401);
    assertStrongPassword(input.newPassword, [user.name, user.email, user.phone]);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(input.newPassword) },
    });
    await this.revokeOthers(userId, currentRefresh);
    return { ok: true };
  }

  /** Signed-in devices: one row per session family. */
  async sessions(userId: string, currentRefresh?: string) {
    const now = new Date();
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    const currentFamily = currentRefresh
      ? (
          await this.prisma.refreshToken.findUnique({
            where: { tokenHash: this.tokens.hashRefreshToken(currentRefresh) },
          })
        )?.familyId
      : undefined;
    const firsts = await this.prisma.refreshToken.groupBy({
      by: ['familyId'],
      where: { familyId: { in: [...new Set(rows.map((r) => r.familyId))] } },
      _min: { createdAt: true },
    });
    const started = new Map(firsts.map((f) => [f.familyId, f._min.createdAt]));
    const seen = new Set<string>();
    return {
      items: rows
        .filter((r) => !seen.has(r.familyId) && seen.add(r.familyId))
        .map((r) => ({
          id: r.familyId,
          userAgent: r.userAgent,
          ip: r.ip,
          createdAt: (started.get(r.familyId) ?? r.createdAt).toISOString(),
          lastUsedAt: r.createdAt.toISOString(),
          current: r.familyId === currentFamily,
        })),
    };
  }

  async revokeSession(userId: string, familyId: string): Promise<{ ok: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    });
    return { ok: true };
  }

  async revokeOthers(userId: string, currentRefresh?: string): Promise<{ ok: true }> {
    const current = currentRefresh
      ? await this.prisma.refreshToken.findUnique({
          where: { tokenHash: this.tokens.hashRefreshToken(currentRefresh) },
        })
      : null;
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(current?.userId === userId ? { familyId: { not: current.familyId } } : {}),
      },
      data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
    });
    return { ok: true };
  }

  private async signIn(user: UserRecord, meta: SessionMeta): Promise<SessionTokens> {
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.auth.openSession(user, meta);
  }

  private async verifyMail(user: UserRecord, lang: 'en' | 'bn') {
    const token = await this.issue(user.id, 'VERIFY_EMAIL', VERIFY_TTL_MS);
    return { kind: 'verify' as const, to: user.email ?? '', name: user.name ?? '', token, lang };
  }

  /** A fresh link; earlier unused links of the same kind stop working. */
  private async issue(userId: string, purpose: AuthTokenPurpose, ttl: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: { userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttl) },
      }),
    ]);
    return token;
  }

  /** Uses a link exactly once (a conditional update, so two clicks cannot both succeed). */
  private async consume(
    token: string,
    purpose: AuthTokenPurpose,
    apply: (
      tx: Prisma.TransactionClient,
      user: UserRecord & { emailVerifiedAt: Date | null },
    ) => Promise<void>,
  ): Promise<UserRecord> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.authToken.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true },
      });
      if (!row || row.purpose !== purpose || row.expiresAt <= new Date() || !row.user.isActive)
        throw invalidLink();
      const { count } = await tx.authToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (!count) throw invalidLink();
      await apply(tx, row.user);
      return row.user;
    });
  }
}
