import { Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  bdDayBounds,
  bdDayOf,
  bdDays,
  bdMonthOf,
  type CustomerList,
  type CustomerListQuery,
  normalizeBdPhone,
  type OrderStatus,
  type ReportRangeQuery,
  resolveReportRange,
  type SalesReport,
  type UnitsSold,
} from '@zelqune/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Paid orders that were not undone: their money counts as sales (same rule as analytics). */
export const COUNTED_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'RETURN_REQUESTED',
];
const RETURNED: OrderStatus[] = ['RETURNED', 'REFUNDED'];
const MAX_ROWS = 20_000;

type Bucket = { orders: number; netPaisa: number };
const add = (map: Map<string, Bucket>, key: string, netPaisa: number) => {
  const b = map.get(key) ?? { orders: 0, netPaisa: 0 };
  b.orders += 1;
  b.netPaisa += netPaisa;
  map.set(key, b);
};
const sorted = <K extends string>(map: Map<string, Bucket>, key: K) =>
  [...map.entries()]
    .sort((a, b) => b[1].netPaisa - a[1].netPaisa)
    .map(([k, v]) => ({ [key]: k, ...v }) as { [P in K]: string } & Bucket);

/** Read-only reports over the order-service's own tables (ADR 0016). */
@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  private range(query: ReportRangeQuery) {
    const range = resolveReportRange(query);
    if (!range)
      throw new AppError('INVALID_RANGE', 'from must be on or before to, at most 366 days', 422);
    return { range, ...bdDayBounds(range.from, range.to) };
  }

  /** Counted orders confirmed in the range, with their lines. */
  private counted(start: Date, end: Date) {
    return this.prisma.order.findMany({
      where: { status: { in: COUNTED_STATUSES }, confirmedAt: { gte: start, lt: end } },
      select: {
        id: true,
        customerPhone: true,
        channel: true,
        saleMode: true,
        paymentMethod: true,
        address: true,
        subtotalPaisa: true,
        discountPaisa: true,
        shippingFeePaisa: true,
        totalPaisa: true,
        couponCode: true,
        confirmedAt: true,
        items: {
          select: {
            variantId: true,
            productId: true,
            sku: true,
            nameEn: true,
            nameBn: true,
            qty: true,
            lineTotalPaisa: true,
          },
        },
      },
      orderBy: { confirmedAt: 'asc' },
      take: MAX_ROWS,
    });
  }

  async sales(query: ReportRangeQuery): Promise<SalesReport> {
    const { range, start, end } = this.range(query);
    const [orders, cancelled, returned, statuses] = await Promise.all([
      this.counted(start, end),
      this.prisma.order.aggregate({
        where: { status: 'CANCELLED', cancelledAt: { gte: start, lt: end } },
        _count: true,
        _sum: { totalPaisa: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: RETURNED }, updatedAt: { gte: start, lt: end } },
        _count: true,
        _sum: { totalPaisa: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: start, lt: end } },
        _count: true,
      }),
    ]);

    const days = new Map(bdDays(range.from, range.to).map((d) => [d, { orders: 0, netPaisa: 0 }]));
    const products = new Map<
      string,
      SalesReport['byProduct'][number] & { orderIds: Set<string> }
    >();
    const variants = new Map<string, SalesReport['byVariant'][number]>();
    const districts = new Map<string, Bucket>();
    const methods = new Map<string, Bucket>();
    const modes = new Map<string, Bucket>();
    const channels = new Map<string, Bucket>();
    const coupons = new Map<string, { orders: number; discountPaisa: number }>();
    const customers = new Map<string, number>();
    let units = 0;
    let gross = 0;
    let discount = 0;
    let shipping = 0;

    for (const o of orders) {
      const net = o.totalPaisa;
      gross += o.subtotalPaisa;
      discount += o.discountPaisa;
      shipping += o.shippingFeePaisa;
      customers.set(o.customerPhone, (customers.get(o.customerPhone) ?? 0) + 1);
      const day = days.get(bdDayOf(o.confirmedAt ?? start));
      if (day) {
        day.orders += 1;
        day.netPaisa += net;
      }
      add(districts, String((o.address as { district?: string }).district ?? 'unknown'), net);
      add(methods, o.paymentMethod, net);
      add(modes, o.saleMode, net);
      add(channels, o.channel, net);
      if (o.couponCode) {
        const c = coupons.get(o.couponCode) ?? { orders: 0, discountPaisa: 0 };
        c.orders += 1;
        c.discountPaisa += o.discountPaisa;
        coupons.set(o.couponCode, c);
      }
      for (const i of o.items) {
        units += i.qty;
        const p = products.get(i.productId) ?? {
          productId: i.productId,
          nameEn: i.nameEn,
          nameBn: i.nameBn,
          units: 0,
          orders: 0,
          revenuePaisa: 0,
          orderIds: new Set<string>(),
        };
        p.units += i.qty;
        p.revenuePaisa += i.lineTotalPaisa;
        p.orderIds.add(o.id);
        p.orders = p.orderIds.size;
        products.set(i.productId, p);
        const v = variants.get(i.variantId) ?? {
          variantId: i.variantId,
          productId: i.productId,
          sku: i.sku,
          nameEn: i.nameEn,
          units: 0,
          revenuePaisa: 0,
        };
        v.units += i.qty;
        v.revenuePaisa += i.lineTotalPaisa;
        variants.set(i.variantId, v);
      }
    }

    const net = gross - discount + shipping;
    return {
      range,
      totals: {
        orders: orders.length,
        units,
        grossPaisa: gross,
        discountPaisa: discount,
        shippingPaisa: shipping,
        netPaisa: net,
        averageOrderPaisa: orders.length ? Math.round(net / orders.length) : 0,
        customers: customers.size,
        repeatCustomers: [...customers.values()].filter((n) => n > 1).length,
        cancelledOrders: cancelled._count,
        cancelledPaisa: cancelled._sum.totalPaisa ?? 0,
        returnedOrders: returned._count,
        returnedPaisa: returned._sum.totalPaisa ?? 0,
      },
      byDay: [...days.entries()].map(([date, b]) => ({ date, ...b })),
      byProduct: [...products.values()]
        .sort((a, b) => b.revenuePaisa - a.revenuePaisa)
        .map(({ orderIds: _ids, ...p }) => p),
      byVariant: [...variants.values()].sort((a, b) => b.revenuePaisa - a.revenuePaisa),
      byDistrict: sorted(districts, 'district'),
      byPaymentMethod: sorted(methods, 'method'),
      bySaleMode: sorted(modes, 'saleMode'),
      byChannel: sorted(channels, 'channel'),
      byCoupon: [...coupons.entries()]
        .map(([code, c]) => ({ code, ...c }))
        .sort((a, b) => b.discountPaisa - a.discountPaisa),
      byStatus: statuses
        .map((s) => ({ status: s.status, orders: s._count }))
        .sort((a, b) => b.orders - a.orders),
    };
  }

  /** Units and revenue per variant and month, for cost of goods in the profit and loss. */
  async unitsSold(query: ReportRangeQuery): Promise<UnitsSold> {
    const { start, end } = this.range(query);
    const orders = await this.counted(start, end);
    const rows = new Map<string, UnitsSold['items'][number]>();
    const months = new Map<string, UnitsSold['months'][number]>();
    for (const o of orders) {
      const month = bdMonthOf(o.confirmedAt ?? start);
      const m = months.get(month) ?? { month, grossPaisa: 0, discountPaisa: 0, shippingPaisa: 0 };
      m.grossPaisa += o.subtotalPaisa;
      m.discountPaisa += o.discountPaisa;
      m.shippingPaisa += o.shippingFeePaisa;
      months.set(month, m);
      for (const i of o.items) {
        const key = `${month}|${i.variantId}`;
        const r = rows.get(key) ?? {
          month,
          variantId: i.variantId,
          sku: i.sku,
          units: 0,
          revenuePaisa: 0,
        };
        r.units += i.qty;
        r.revenuePaisa += i.lineTotalPaisa;
        rows.set(key, r);
      }
    }
    return { items: [...rows.values()], months: [...months.values()] };
  }

  /** Everyone who has ordered, grouped by phone (no customer accounts until M2). */
  async customers(query: CustomerListQuery): Promise<CustomerList> {
    const counted = Prisma.join(COUNTED_STATUSES.map((s) => Prisma.sql`${s}::"OrderStatus"`));
    const q = query.q?.trim();
    const phone = q ? normalizeBdPhone(q) : null;
    const where = q
      ? phone
        ? Prisma.sql`WHERE o.customer_phone = ${phone}`
        : Prisma.sql`WHERE o.customer_name ILIKE ${`%${q}%`} OR o.customer_phone LIKE ${`%${q.replace(/\D/g, '') || q}%`}`
      : Prisma.empty;
    const order =
      query.sort === 'spent'
        ? Prisma.sql`spent DESC, last_at DESC`
        : query.sort === 'orders'
          ? Prisma.sql`orders DESC, last_at DESC`
          : Prisma.sql`last_at DESC`;
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [stats]] = await Promise.all([
      this.prisma.$queryRaw<
        {
          phone: string;
          name: string;
          district: string | null;
          orders: bigint;
          paid: bigint;
          spent: bigint;
          first_at: Date;
          last_at: Date;
          channels: string[];
          is_friend: boolean | null;
        }[]
      >`
        SELECT o.customer_phone AS phone,
          (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
          (array_agg(o.address->>'district' ORDER BY o.created_at DESC))[1] AS district,
          count(*) AS orders,
          count(*) FILTER (WHERE o.status IN (${counted})) AS paid,
          coalesce(sum(o.total_paisa) FILTER (WHERE o.status IN (${counted})), 0) AS spent,
          min(o.created_at) AS first_at,
          max(o.created_at) AS last_at,
          array_agg(DISTINCT o.channel::text) AS channels,
          bool_or(c.is_friend) AS is_friend
        FROM orders o LEFT JOIN customers c ON c.phone = o.customer_phone
        ${where}
        GROUP BY o.customer_phone
        ORDER BY ${order}
        LIMIT ${query.pageSize} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ customers: bigint; repeat: bigint; spent: bigint }[]>`
        SELECT count(*) AS customers,
          count(*) FILTER (WHERE n > 1) AS repeat,
          coalesce(sum(spent), 0) AS spent
        FROM (
          SELECT o.customer_phone, count(*) AS n,
            coalesce(sum(o.total_paisa) FILTER (WHERE o.status IN (${counted})), 0) AS spent
          FROM orders o ${where} GROUP BY o.customer_phone
        ) t`,
    ]);

    return {
      items: rows.map((r) => ({
        phone: r.phone,
        name: r.name,
        district: r.district,
        orders: Number(r.orders),
        paidOrders: Number(r.paid),
        spentPaisa: Number(r.spent),
        firstOrderAt: r.first_at.toISOString(),
        lastOrderAt: r.last_at.toISOString(),
        isFriend: r.is_friend ?? false,
        channels: r.channels,
      })),
      total: Number(stats?.customers ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      stats: {
        customers: Number(stats?.customers ?? 0),
        repeat: Number(stats?.repeat ?? 0),
        spentPaisa: Number(stats?.spent ?? 0),
      },
    };
  }
}
