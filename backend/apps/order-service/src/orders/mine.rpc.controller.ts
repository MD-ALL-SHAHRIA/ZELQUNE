import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { type MyOrders, type MyRequests, RPC_PATTERNS, type RpcRequest } from '@zelqune/contracts';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const LIMIT = 50;
const userId = (req: RpcRequest<{ userId: string }>) => z.uuid().parse(req.data.userId);

/** A signed-in customer's own orders and requests (ADR 0021): filtered by account, newest first. */
@Controller()
export class MineRpcController {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern(RPC_PATTERNS.order.mine.orders)
  async orders(@Payload() req: RpcRequest<{ userId: string }>): Promise<MyOrders> {
    const rows = await this.prisma.order.findMany({
      where: { customerUserId: userId(req) },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      include: { items: { select: { nameEn: true, nameBn: true, qty: true } } },
    });
    return {
      items: rows.map((o) => ({
        code: o.code,
        status: o.status,
        saleMode: o.saleMode,
        createdAt: o.createdAt.toISOString(),
        totalPaisa: o.totalPaisa,
        items: o.items,
      })),
    };
  }

  @MessagePattern(RPC_PATTERNS.order.mine.requests)
  async requests(@Payload() req: RpcRequest<{ userId: string }>): Promise<MyRequests> {
    const rows = await this.prisma.quote.findMany({
      where: { customerUserId: userId(req) },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
      select: { code: true, kind: true, status: true, createdAt: true },
    });
    return { items: rows.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })) };
  }
}
