import { Injectable } from '@nestjs/common';
import { AppError, OutboxService } from '@zelqune/common';
import { type EventEnvelope } from '@zelqune/contracts';
import { Prisma, type SagaStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Where an order comes from: a storefront cart or an accepted B2B quote. */
export type SagaSource = { kind: 'cart'; cartId: string } | { kind: 'quote'; quoteId: string };

export interface SagaRecord {
  id: string;
  cartId: string | null;
  quoteId: string | null;
  code: string;
  status: SagaStatus;
  stockReserved: boolean;
  paymentCreated: boolean;
}

export type OrderDraft = Omit<Prisma.OrderUncheckedCreateInput, 'items' | 'history' | 'notes'> & {
  id: string;
  items: Prisma.OrderItemCreateManyOrderInput[];
};

export class OrderCodeTakenError extends Error {}

export const ACTIVE_SAGA_STATUSES: SagaStatus[] = [
  'STARTED',
  'STOCK_RESERVED',
  'PAYMENT_CREATED',
  'COMPENSATING',
];

/** Persistence for the checkout saga (in-memory fake in unit tests). */
export interface SagaStore {
  start(saga: { id: string; source: SagaSource; code: string }): Promise<void>;
  /** Conditional transition; false if the saga was no longer in `from` (e.g. being recovered). */
  advance(
    id: string,
    from: SagaStatus,
    to: SagaStatus,
    flags?: Partial<Pick<SagaRecord, 'stockReserved' | 'paymentCreated'>>,
  ): Promise<boolean>;
  fail(id: string, error: string): Promise<void>;
  /** Moves an unfinished saga to COMPENSATING; null if it is already terminal. */
  beginCompensation(id: string, error: string): Promise<SagaRecord | null>;
  finishCompensation(id: string): Promise<void>;
  /**
   * In one transaction: requires saga PAYMENT_CREATED and the source still open (cart ACTIVE /
   * quote ACCEPTED and not converted), creates the order with its items and first history row,
   * closes the source, marks the saga COMPLETED and writes order.placed to the outbox.
   */
  complete(id: string, order: OrderDraft, event: EventEnvelope, source: SagaSource): Promise<void>;
  findStale(updatedBefore: Date, limit: number): Promise<SagaRecord[]>;
}

export const SAGA_STORE = Symbol('SAGA_STORE');

const isUniqueViolation = (err: unknown, field: string): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === 'P2002' &&
  JSON.stringify(err.meta ?? {}).includes(field);

@Injectable()
export class PrismaSagaStore implements SagaStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async start({
    id,
    source,
    code,
  }: {
    id: string;
    source: SagaSource;
    code: string;
  }): Promise<void> {
    try {
      await this.prisma.checkoutSaga.create({
        data: {
          id,
          code,
          status: 'STARTED',
          cartId: source.kind === 'cart' ? source.cartId : null,
          quoteId: source.kind === 'quote' ? source.quoteId : null,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err, 'code')) throw new OrderCodeTakenError(code);
      throw err;
    }
  }

  async advance(id: string, from: SagaStatus, to: SagaStatus, flags = {}): Promise<boolean> {
    const { count } = await this.prisma.checkoutSaga.updateMany({
      where: { id, status: from },
      data: { status: to, ...flags },
    });
    return count === 1;
  }

  async fail(id: string, error: string): Promise<void> {
    await this.prisma.checkoutSaga.updateMany({
      where: { id, status: 'STARTED' },
      data: { status: 'FAILED', lastError: error.slice(0, 500) },
    });
  }

  async beginCompensation(id: string, error: string): Promise<SagaRecord | null> {
    const { count } = await this.prisma.checkoutSaga.updateMany({
      where: { id, status: { in: ACTIVE_SAGA_STATUSES } },
      data: { status: 'COMPENSATING', lastError: error.slice(0, 500) },
    });
    return count === 1 ? this.prisma.checkoutSaga.findUnique({ where: { id } }) : null;
  }

  async finishCompensation(id: string): Promise<void> {
    await this.prisma.checkoutSaga.updateMany({
      where: { id, status: 'COMPENSATING' },
      data: { status: 'COMPENSATED' },
    });
  }

  async complete(
    id: string,
    order: OrderDraft,
    event: EventEnvelope,
    source: SagaSource,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [saga] = await tx.$queryRaw<{ status: SagaStatus }[]>`
        SELECT status FROM checkout_sagas WHERE id = ${id}::uuid FOR UPDATE`;
      if (saga?.status !== 'PAYMENT_CREATED') {
        throw new AppError('CHECKOUT_ABORTED', 'Checkout was interrupted, please try again', 409);
      }
      if (source.kind === 'cart') {
        const [cart] = await tx.$queryRaw<{ status: string }[]>`
          SELECT status FROM carts WHERE id = ${source.cartId}::uuid FOR UPDATE`;
        if (cart?.status !== 'ACTIVE') {
          throw new AppError('CART_CHECKED_OUT', 'This cart was already checked out', 409);
        }
      } else {
        await this.lockOpenQuote(tx, source.quoteId);
      }

      const { items, ...fields } = order;
      await tx.order.create({
        data: {
          ...fields,
          items: { createMany: { data: items } },
          history: { create: { from: null, to: fields.status, actor: 'customer' } },
        },
      });
      if (source.kind === 'cart') {
        await tx.cart.update({
          where: { id: source.cartId },
          data: { status: 'CHECKED_OUT', orderId: id },
        });
      } else {
        await this.closeQuote(tx, source.quoteId, id);
      }
      await tx.checkoutSaga.update({ where: { id }, data: { status: 'COMPLETED' } });
      await this.outbox.add(tx, event);
    });
  }

  findStale(updatedBefore: Date, limit: number): Promise<SagaRecord[]> {
    return this.prisma.checkoutSaga.findMany({
      where: { status: { in: ACTIVE_SAGA_STATUSES }, updatedAt: { lt: updatedBefore } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  /** Quote support arrives with the B2B quote module (same step). */
  protected lockOpenQuote(_tx: Prisma.TransactionClient, _quoteId: string): Promise<void> {
    return Promise.reject(
      new AppError('QUOTE_NOT_CONVERTIBLE', 'Quotes are not supported yet', 409),
    );
  }

  protected closeQuote(
    _tx: Prisma.TransactionClient,
    _quoteId: string,
    _orderId: string,
  ): Promise<void> {
    return Promise.reject(
      new AppError('QUOTE_NOT_CONVERTIBLE', 'Quotes are not supported yet', 409),
    );
  }
}
