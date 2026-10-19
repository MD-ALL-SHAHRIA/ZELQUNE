import { Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  type AuditLogPage,
  type AuditLogQuery,
  type DashboardQuery,
  type DashboardStats,
  GO_TARGET,
} from '@zelqune/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  bdRange,
  bdToday,
  BD_TZ,
  conversionRate,
  GO_STATUSES,
  resolveRange,
  REVENUE_STATUSES,
} from './stats-rules';

const revenueStatuses = Prisma.join([...REVENUE_STATUSES]);
const goStatuses = Prisma.join([...GO_STATUSES]);

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: DashboardQuery, now = new Date()): Promise<DashboardStats> {
    let range: { from: string; to: string };
    try {
      range = resolveRange(query, now);
    } catch (err) {
      throw new AppError('INVALID_RANGE', (err as Error).message, 422);
    }
    const { start, end } = bdRange(range.from, range.to);
    const today = bdRange(bdToday(now), bdToday(now));

    const [funnel] = await this.prisma.$queryRaw<{ views: bigint; add_to_cart: bigint }[]>`
      SELECT
        count(DISTINCT session_id) FILTER (WHERE type = 'VIEW') AS views,
        count(DISTINCT session_id) FILTER (WHERE type = 'ADD_TO_CART') AS add_to_cart
      FROM tracked_events WHERE occurred_at >= ${start} AND occurred_at < ${end}`;

    const [orders] = await this.prisma.$queryRaw<{ checkout: bigint; purchase: bigint }[]>`
      SELECT
        count(*) AS checkout,
        count(*) FILTER (WHERE status IN (${revenueStatuses})) AS purchase
      FROM order_facts
      WHERE channel = 'B2C' AND placed_at >= ${start} AND placed_at < ${end}`;

    const revenueByDay = await this.prisma.$queryRaw<
      { date: string; orders: bigint; revenue: bigint }[]
    >`
      SELECT to_char(confirmed_at AT TIME ZONE ${BD_TZ}, 'YYYY-MM-DD') AS date,
             count(*) AS orders, coalesce(sum(total_paisa), 0) AS revenue
      FROM order_facts
      WHERE confirmed_at >= ${start} AND confirmed_at < ${end} AND status IN (${revenueStatuses})
      GROUP BY 1 ORDER BY 1`;

    const [todayRow] = await this.prisma.$queryRaw<{ orders: bigint; revenue: bigint }[]>`
      SELECT
        (SELECT count(*) FROM order_facts WHERE placed_at >= ${today.start} AND placed_at < ${today.end}) AS orders,
        (SELECT coalesce(sum(total_paisa), 0) FROM order_facts
          WHERE confirmed_at >= ${today.start} AND confirmed_at < ${today.end} AND status IN (${revenueStatuses})) AS revenue`;

    // GO (all time): B2C, not a friend, active paid status, VERIFIED advance > 0.
    const [go] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count
      FROM order_facts f LEFT JOIN customer_flags c ON c.customer_key = f.customer_key
      WHERE f.channel = 'B2C' AND f.status IN (${goStatuses}) AND f.advance_verified_paisa > 0
        AND coalesce(c.is_friend, false) = false`;

    const experiments = await this.prisma.$queryRaw<
      { key: string; sessions: bigint; checkouts: bigint; purchases: bigint }[]
    >`
      SELECT k.key,
        (SELECT count(DISTINCT session_id) FROM tracked_events
          WHERE type = 'VIEW' AND experiment_key = k.key AND occurred_at >= ${start} AND occurred_at < ${end}) AS sessions,
        (SELECT count(*) FROM order_facts
          WHERE channel = 'B2C' AND experiment_key = k.key AND placed_at >= ${start} AND placed_at < ${end}) AS checkouts,
        (SELECT count(*) FROM order_facts
          WHERE channel = 'B2C' AND experiment_key = k.key AND placed_at >= ${start} AND placed_at < ${end}
            AND status IN (${revenueStatuses})) AS purchases
      FROM (VALUES ('a'), ('b')) AS k(key)`;

    const channels = await this.prisma.$queryRaw<
      { channel: 'B2C' | 'B2B'; orders: bigint; revenue: bigint }[]
    >`
      SELECT channel::text AS channel, count(*) AS orders, coalesce(sum(total_paisa), 0) AS revenue
      FROM order_facts
      WHERE confirmed_at >= ${start} AND confirmed_at < ${end} AND status IN (${revenueStatuses})
      GROUP BY 1`;
    const ch = (c: 'B2C' | 'B2B') => {
      const row = channels.find((r) => r.channel === c);
      return { orders: Number(row?.orders ?? 0), revenuePaisa: Number(row?.revenue ?? 0) };
    };

    const goCount = Number(go.count);
    return {
      range,
      today: { orders: Number(todayRow.orders), revenuePaisa: Number(todayRow.revenue) },
      funnel: {
        views: Number(funnel.views),
        addToCart: Number(funnel.add_to_cart),
        checkout: Number(orders.checkout),
        purchase: Number(orders.purchase),
      },
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        orders: Number(r.orders),
        revenuePaisa: Number(r.revenue),
      })),
      go: { count: goCount, target: GO_TARGET, reached: goCount >= GO_TARGET },
      experiments: experiments.map((e) => ({
        key: e.key as 'a' | 'b',
        sessions: Number(e.sessions),
        checkouts: Number(e.checkouts),
        purchases: Number(e.purchases),
        conversionRate: conversionRate(Number(e.purchases), Number(e.sessions)),
      })),
      channels: { b2c: ch('B2C'), b2b: ch('B2B') },
    };
  }

  async auditLog(query: AuditLogQuery): Promise<AuditLogPage> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt.toISOString(),
        source: r.source,
        actor: {
          id: r.actorId,
          role: r.actorRole as AuditLogPage['items'][number]['actor']['role'],
        },
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        summary: r.summary,
        changes: (r.changes as Record<string, unknown> | null) ?? null,
        requestId: r.requestId,
      })),
      page: query.page,
      limit: query.limit,
      total,
    };
  }
}
