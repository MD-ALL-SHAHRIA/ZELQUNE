import { Injectable } from '@nestjs/common';
import { AppError, OutboxService, recordAudit } from '@zelqune/common';
import {
  type AuthUser,
  changePasswordSchema,
  createTeamMemberSchema,
  type CreateTeamMemberInput,
  normalizeBdPhone,
  resetPasswordSchema,
  type TeamMember,
  updateProfileSchema,
  updateTeamMemberSchema,
  type UpdateTeamMemberInput,
} from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';

const SOURCE = 'identity-service';
const TEAM = { role: { in: ['OWNER', 'STAFF'] } } satisfies Prisma.UserWhereInput;
type Row = Prisma.UserGetPayload<object>;

const masked = (phone: string) => `${phone.slice(0, 7)}******`;

/**
 * The owner's team: who can sign in to the dashboard and with which role. Deactivating someone,
 * changing their role or resetting their password ends their sessions at once.
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly outbox: OutboxService,
  ) {}

  async list(): Promise<{ items: TeamMember[] }> {
    const rows = await this.prisma.user.findMany({
      where: TEAM,
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });
    return { items: rows.map((r) => this.view(r)) };
  }

  async create(raw: CreateTeamMemberInput): Promise<TeamMember> {
    const parsed = createTeamMemberSchema.parse(raw);
    const input = { ...parsed, phone: normalizeBdPhone(parsed.phone) ?? parsed.phone };
    const passwordHash = await this.passwords.hash(input.password);
    return this.prisma
      .$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { phone: input.phone } });
        if (existing && existing.role !== 'CUSTOMER')
          throw new AppError(
            'TEAM_MEMBER_EXISTS',
            'This phone already has a dashboard account',
            409,
          );
        const data = {
          name: input.name,
          email: input.email || null,
          role: input.role,
          passwordHash,
          isActive: true,
        };
        const row = existing
          ? await tx.user.update({ where: { id: existing.id }, data })
          : await tx.user.create({ data: { phone: input.phone, ...data } });
        await recordAudit(this.outbox, tx, SOURCE, {
          action: 'teamMember.create',
          entityType: 'user',
          entityId: row.id,
          summary: `${input.name} (${masked(row.phone)}) added as ${input.role.toLowerCase()}`,
          changes: { role: input.role },
        });
        return this.view(row);
      })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002')
          throw new AppError('EMAIL_TAKEN', 'This email is already used by another account', 409);
        throw err;
      });
  }

  async update(actorId: string, id: string, raw: UpdateTeamMemberInput): Promise<TeamMember> {
    const changes = updateTeamMemberSchema.parse(raw);
    return this.prisma
      .$transaction(async (tx) => {
        const before = await tx.user.findFirst({ where: { id, ...TEAM } });
        if (!before) throw new AppError('TEAM_MEMBER_NOT_FOUND', 'Team member not found', 404);
        const demoted = changes.role !== undefined && changes.role !== before.role;
        const deactivated = changes.isActive === false && before.isActive;
        if (id === actorId && (demoted || deactivated))
          throw new AppError(
            'CANNOT_CHANGE_SELF',
            'You cannot change your own role or access',
            422,
          );
        if (before.role === 'OWNER' && (demoted || deactivated)) {
          const owners = await tx.user.count({ where: { role: 'OWNER', isActive: true } });
          if (owners <= 1)
            throw new AppError('LAST_OWNER', 'The store needs at least one active owner', 422);
        }
        const row = await tx.user.update({
          where: { id },
          data: {
            ...changes,
            ...(changes.email !== undefined ? { email: changes.email || null } : {}),
          },
        });
        if (demoted || deactivated) await this.endSessions(tx, id);
        await recordAudit(this.outbox, tx, SOURCE, {
          action: 'teamMember.update',
          entityType: 'user',
          entityId: id,
          summary: `${row.name ?? masked(row.phone)} updated: ${Object.keys(changes).join(', ')}`,
          changes: { ...changes },
        });
        return this.view(row);
      })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002')
          throw new AppError('EMAIL_TAKEN', 'This email is already used by another account', 409);
        throw err;
      });
  }

  /** Owner sets a new password for someone (they are signed out everywhere). */
  async resetPassword(id: string, raw: unknown): Promise<{ ok: true }> {
    const { password } = resetPasswordSchema.parse(raw);
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({ where: { id, ...TEAM } });
      if (!user) throw new AppError('TEAM_MEMBER_NOT_FOUND', 'Team member not found', 404);
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await this.endSessions(tx, id);
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'teamMember.resetPassword',
        entityType: 'user',
        entityId: id,
        summary: `Password reset for ${user.name ?? masked(user.phone)}`,
      });
    });
    return { ok: true };
  }

  /** Signed-in user changes their own password (needs the current one). */
  async changePassword(userId: string, raw: unknown): Promise<{ ok: true }> {
    const input = changePasswordSchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.passwords.verify(user.passwordHash, input.currentPassword)))
      throw new AppError('WRONG_PASSWORD', 'The current password is not right', 422);
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'teamMember.changePassword',
        entityType: 'user',
        entityId: userId,
        summary: `${user.name ?? masked(user.phone)} changed their password`,
      });
    });
    return { ok: true };
  }

  async updateProfile(userId: string, raw: unknown): Promise<AuthUser> {
    const input = updateProfileSchema.parse(raw);
    const row = await this.prisma.user
      .update({ where: { id: userId }, data: { name: input.name, email: input.email || null } })
      .catch((err: unknown) => {
        if ((err as { code?: string }).code === 'P2002')
          throw new AppError('EMAIL_TAKEN', 'This email is already used by another account', 409);
        throw err;
      });
    return { id: row.id, phone: row.phone, name: row.name, email: row.email, role: row.role };
  }

  private async endSessions(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'ADMIN_REVOKED' },
    });
  }

  private view(r: Row): TeamMember {
    return {
      id: r.id,
      phone: r.phone,
      name: r.name,
      email: r.email,
      role: r.role === 'OWNER' ? 'OWNER' : 'STAFF',
      isActive: r.isActive,
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
