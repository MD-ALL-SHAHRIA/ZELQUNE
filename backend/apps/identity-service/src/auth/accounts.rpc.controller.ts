import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CustomerAccount,
  type CustomerAccountList,
  customerAccountListQuerySchema,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { z } from 'zod';
import { type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const P = RPC_PATTERNS.identity.accounts;
type Row = Prisma.UserGetPayload<{ include: { oauthAccounts: { select: { provider: true } } } }>;

const view = (u: Row): CustomerAccount => ({
  id: u.id,
  name: u.name,
  email: u.email,
  emailVerified: !!u.emailVerifiedAt,
  phone: u.phone,
  providers: [...new Set(u.oauthAccounts.map((a) => a.provider))],
  createdAt: u.createdAt.toISOString(),
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
});

/** Customer accounts for the dashboard (ADR 0021). Never passwords, tokens or sessions. */
@Controller()
export class AccountsRpcController {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern(P.list)
  async list(@Payload() req: RpcRequest<unknown>): Promise<CustomerAccountList> {
    const q = customerAccountListQuerySchema.parse(req.data ?? {});
    const term = q.q?.replace(/^0/, '');
    const where: Prisma.UserWhereInput = {
      role: 'CUSTOMER',
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { oauthAccounts: { select: { provider: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: rows.map(view), total, page: q.page, limit: q.limit };
  }

  @MessagePattern(P.byIds)
  async byIds(@Payload() req: RpcRequest<{ ids: string[] }>): Promise<CustomerAccount[]> {
    const ids = z.array(z.uuid()).max(200).parse(req.data.ids);
    if (!ids.length) return [];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids }, role: 'CUSTOMER' },
      include: { oauthAccounts: { select: { provider: true } } },
    });
    return rows.map(view);
  }
}
