import { Inject, Injectable } from '@nestjs/common';
import {
  APP_CONFIG,
  AppError,
  currentActor,
  OutboxService,
  recordAudit,
  requestContext,
} from '@zelqune/common';
import {
  adminPrivacyListQuerySchema,
  askVerificationInputSchema,
  completePrivacyInputSchema,
  correctPrivacyInputSchema,
  ORDER_CODE_ALPHABET,
  type PrivacyExport,
  type PrivacyList,
  type PrivacyRequestDetail,
  type PrivacyRequestStatus,
  type PrivacyResult,
  type PublicPrivacyRequest,
  privacyErased,
  privacyTrackSchema,
  rejectPrivacyInputSchema,
  submitPrivacyRequestSchema,
  type SubmitPrivacyResult,
  verifyPrivacyInputSchema,
} from '@zelqune/contracts';
import { randomInt } from 'node:crypto';
import { type OrderEnv } from '../config/order-env';
import { customerKey } from '../domain/customer-key';
import { Prisma, type PrivacyRequest } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTION_TYPES, canTransitionPrivacy, ERASED, maskPhone, orderFate } from './privacy-rules';

const SOURCE = 'order-service';
const CODE_ATTEMPTS = 5;
const OPEN: PrivacyRequestStatus[] = ['PENDING', 'VERIFICATION_REQUIRED', 'IN_PROGRESS'];
const privacyCode = () =>
  `PR-${Array.from({ length: 6 }, () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)]).join('')}`;

/** Personal data this service does not hold, named in every export (ADR 0020). */
const ELSEWHERE = [
  'Payment records: the bKash/Nagad Transaction ID and the paying number for each order (payment service), kept with the sale.',
  'SMS sent about your orders, if any (notification service).',
  'Analytics: a random visit id and a pseudonymous customer key, never your name or phone number.',
  'Messages you sent us on WhatsApp are held by WhatsApp, not on this website.',
];

/**
 * Privacy requests (ADR 0020). The public side submits and checks a status; it never learns
 * whether a phone number has records. The owner verifies identity out of band (calling the
 * number on file), then exports, corrects or erases. Every step is audited without personal data.
 */
@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) private readonly config: OrderEnv,
  ) {}

  private key(phone: string): string {
    return customerKey(this.config.CUSTOMER_KEY_SECRET, phone);
  }

  /** Public. A second open request of the same type for the same phone returns the first code. */
  async submit(raw: unknown): Promise<SubmitPrivacyResult> {
    const input = submitPrivacyRequestSchema.parse(raw);
    const phoneKey = this.key(input.phone);
    const open = await this.prisma.privacyRequest.findFirst({
      where: { phoneKey, type: input.type, status: { in: OPEN } },
    });
    if (open) return { code: open.code };

    const referenceMatched = input.reference
      ? input.reference.startsWith('ZQ-')
        ? !!(await this.prisma.order.findFirst({
            where: { code: input.reference, customerPhone: input.phone },
            select: { id: true },
          }))
        : !!(await this.prisma.quote.findFirst({
            where: { code: input.reference, phone: input.phone },
            select: { id: true },
          }))
      : false;

    for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
      const code = privacyCode();
      try {
        await this.prisma.$transaction(async (tx) => {
          const r = await tx.privacyRequest.create({
            data: {
              code,
              type: input.type,
              phone: input.phone,
              phoneKey,
              email: input.email ?? null,
              reference: input.reference ?? null,
              referenceMatched,
              details: input.details,
            },
          });
          await recordAudit(this.outbox, tx, SOURCE, {
            action: 'privacy.submit',
            entityType: 'privacy_request',
            entityId: r.id,
            summary: `${code}: ${input.type} request received`,
          });
        });
        return { code };
      } catch (err) {
        const taken = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!taken) throw err;
      }
    }
    throw new AppError('PRIVACY_REQUEST_FAILED', 'Please try again', 503);
  }

  /** Public status by code + phone (same 404 for both mismatches). */
  async track(raw: unknown): Promise<PublicPrivacyRequest> {
    const { code, phone } = privacyTrackSchema.parse(raw);
    const r = await this.prisma.privacyRequest.findUnique({ where: { code } });
    if (!r || r.phoneKey !== this.key(phone))
      throw new AppError('PRIVACY_REQUEST_NOT_FOUND', 'No request with this code and phone', 404);
    return {
      code: r.code,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async list(raw: unknown): Promise<PrivacyList> {
    const q = adminPrivacyListQuerySchema.parse(raw ?? {});
    const where = q.status ? { status: q.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.privacyRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.privacyRequest.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        status: r.status,
        referenceMatched: r.referenceMatched,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async get(id: string): Promise<PrivacyRequestDetail> {
    const r = await this.find(id);
    const [orders, quotes] = await Promise.all([
      this.prisma.order.count({ where: { customerPhone: r.phone } }),
      this.prisma.quote.count({ where: { phone: r.phone } }),
    ]);
    return {
      id: r.id,
      code: r.code,
      type: r.type,
      status: r.status,
      referenceMatched: r.referenceMatched,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      phone: r.phone,
      email: r.email,
      reference: r.reference,
      details: r.details,
      found: { orders, quotes },
      verification:
        r.verifiedAt && r.verificationMethod
          ? {
              method: r.verificationMethod as NonNullable<
                PrivacyRequestDetail['verification']
              >['method'],
              note: r.verificationNote ?? '',
              at: r.verifiedAt.toISOString(),
              by: r.verifiedBy ?? '',
            }
          : null,
      decisionNote: r.decisionNote,
      result: (r.result as PrivacyResult | null) ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    };
  }

  /** The requester must confirm from the number on file before anything is shown or changed. */
  async askVerification(id: string, raw: unknown): Promise<PrivacyRequestDetail> {
    const { note } = askVerificationInputSchema.parse(raw ?? {});
    await this.move(
      id,
      'VERIFICATION_REQUIRED',
      { decisionNote: note || null },
      'privacy.askVerification',
    );
    return this.get(id);
  }

  async verify(id: string, raw: unknown): Promise<PrivacyRequestDetail> {
    const input = verifyPrivacyInputSchema.parse(raw);
    const actor = currentActor();
    await this.move(
      id,
      'IN_PROGRESS',
      {
        verificationMethod: input.method,
        verificationNote: input.note,
        verifiedAt: new Date(),
        verifiedBy: actor.id,
      },
      'privacy.verify',
      `identity verified (${input.method})`,
    );
    return this.get(id);
  }

  async reject(id: string, raw: unknown): Promise<PrivacyRequestDetail> {
    const { reason } = rejectPrivacyInputSchema.parse(raw);
    await this.move(id, 'REJECTED', this.resolved({ decisionNote: reason }), 'privacy.reject');
    return this.get(id);
  }

  /** Access: everything this service holds for the phone, as JSON for the owner to hand over. */
  async export(id: string): Promise<PrivacyExport> {
    const r = await this.ready(id, 'export');
    const [orders, quotes, flag] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerPhone: r.phone },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.quote.findMany({ where: { phone: r.phone }, orderBy: { createdAt: 'asc' } }),
      this.prisma.customer.findUnique({ where: { phone: r.phone } }),
    ]);
    const exportedAt = new Date().toISOString();
    await this.prisma.$transaction(async (tx) => {
      await tx.privacyRequest.update({
        where: { id },
        data: { result: { kind: 'ACCESS', exportedAt } satisfies PrivacyResult },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'privacy.export',
        entityType: 'privacy_request',
        entityId: id,
        summary: `${r.code}: data exported (${orders.length} orders, ${quotes.length} requests)`,
      });
    });
    return {
      generatedAt: exportedAt,
      phone: r.phone,
      orders: orders.map((o) => ({
        code: o.code,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        name: o.customerName,
        address: o.address,
        paymentMethod: o.paymentMethod,
        totalPaisa: o.totalPaisa,
        couponCode: o.couponCode,
        items: o.items.map((i) => ({
          name: i.nameEn,
          qty: i.qty,
          unitPricePaisa: i.unitPricePaisa,
        })),
      })),
      quotes: quotes.map((q) => ({
        code: q.code,
        createdAt: q.createdAt.toISOString(),
        kind: q.kind,
        status: q.status,
        contactName: q.contactName,
        email: q.email,
        organizationName: q.organizationName,
        notes: q.notes,
      })),
      customerFlag: flag ? { isFriend: flag.isFriend } : null,
      elsewhere: ELSEWHERE,
    };
  }

  /** Correction of the name and/or email on every record for this phone. */
  async correct(id: string, raw: unknown): Promise<PrivacyRequestDetail> {
    const input = correctPrivacyInputSchema.parse(raw);
    const r = await this.ready(id, 'correct');
    const fields = [input.name ? 'name' : null, input.email ? 'email' : null].filter(
      (f): f is 'name' | 'email' => f !== null,
    );
    await this.prisma.$transaction(async (tx) => {
      const orders = input.name
        ? await tx.order.updateMany({
            where: { customerPhone: r.phone },
            data: { customerName: input.name },
          })
        : { count: 0 };
      const quotes = await tx.quote.updateMany({
        where: { phone: r.phone },
        data: {
          ...(input.name ? { contactName: input.name } : {}),
          ...(input.email ? { email: input.email } : {}),
        },
      });
      const result: PrivacyResult = {
        kind: 'CORRECTION',
        fields,
        orders: orders.count,
        quotes: quotes.count,
      };
      await this.finish(tx, r, result, 'privacy.correct', `corrected ${fields.join(', ')}`);
    });
    return this.get(id);
  }

  /**
   * Deletion. Orders where no money moved and requests that never became a sale are anonymised;
   * sales are kept as accounting records; running orders block the erasure. Other services
   * follow through the privacy.erased event. The request keeps only a masked phone.
   */
  async erase(id: string): Promise<PrivacyRequestDetail> {
    const r = await this.ready(id, 'erase');
    await this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { customerPhone: r.phone },
        select: { id: true, code: true, status: true, confirmedAt: true },
      });
      const blocked = orders.filter((o) => orderFate(o) === 'BLOCK');
      if (blocked.length)
        throw new AppError(
          'PRIVACY_ORDERS_ACTIVE',
          `Finish or cancel these orders first: ${blocked.map((o) => o.code).join(', ')}`,
          409,
        );
      const erase = orders.filter((o) => orderFate(o) === 'ERASE');
      const retain = orders.filter((o) => orderFate(o) === 'RETAIN');
      const retainedIds = new Set(retain.map((o) => o.id));

      if (erase.length) {
        const ids = erase.map((o) => o.id);
        await tx.orderNote.deleteMany({ where: { orderId: { in: ids } } });
        await tx.order.updateMany({
          where: { id: { in: ids } },
          data: {
            customerName: ERASED,
            customerPhone: ERASED,
            address: {},
            sessionId: null,
            utm: Prisma.DbNull,
          },
        });
      }

      const quotes = await tx.quote.findMany({
        where: { phone: r.phone },
        select: { id: true, code: true, orderId: true },
      });
      const keptQuotes = quotes.filter((q) => q.orderId && retainedIds.has(q.orderId));
      const goneQuotes = quotes.filter((q) => !keptQuotes.includes(q));
      if (goneQuotes.length)
        await tx.quote.updateMany({
          where: { id: { in: goneQuotes.map((q) => q.id) } },
          data: {
            contactName: ERASED,
            phone: ERASED,
            email: null,
            organizationName: null,
            notes: null,
            customizationNotes: null,
            utm: Prisma.DbNull,
          },
        });

      const flag = await tx.customer.deleteMany({ where: { phone: r.phone } });

      await this.outbox.add(
        tx,
        privacyErased.create(
          {
            requestId: r.id,
            phone: r.phone,
            customerKey: this.key(r.phone),
            erasedOrderIds: erase.map((o) => o.id),
          },
          { source: SOURCE, requestId: requestContext.requestId() },
        ),
      );
      const result: PrivacyResult = {
        kind: 'ERASURE',
        erasedOrders: erase.map((o) => o.code),
        erasedQuotes: goneQuotes.map((q) => q.code),
        retainedOrders: retain.map((o) => ({ code: o.code, reason: 'SALE_RECORD' as const })),
        retainedQuotes: keptQuotes.map((q) => ({
          code: q.code,
          reason: 'CONTRACT_RECORD' as const,
        })),
        customerFlagDeleted: flag.count > 0,
      };
      await this.finish(
        tx,
        r,
        result,
        'privacy.erase',
        `erased ${erase.length} orders and ${goneQuotes.length} requests; kept ${retain.length} sales`,
        retain.length ? r.phone : maskPhone(r.phone),
      );
    });
    return this.get(id);
  }

  /** Access (after the export was handed over) and consent withdrawal end with a note. */
  async complete(id: string, raw: unknown): Promise<PrivacyRequestDetail> {
    const { note } = completePrivacyInputSchema.parse(raw);
    const r = await this.ready(id, 'complete');
    const result = (r.result as PrivacyResult | null) ?? { kind: 'NOTE' as const };
    if (r.type === 'ACCESS' && result.kind !== 'ACCESS')
      throw new AppError('PRIVACY_EXPORT_FIRST', 'Export the data before completing', 409);
    await this.prisma.$transaction(async (tx) => {
      await tx.privacyRequest.update({ where: { id }, data: { decisionNote: note } });
      await this.finish(tx, r, result, 'privacy.complete', 'completed');
    });
    return this.get(id);
  }

  private async find(id: string): Promise<PrivacyRequest> {
    const r = await this.prisma.privacyRequest.findUnique({ where: { id } });
    if (!r) throw new AppError('PRIVACY_REQUEST_NOT_FOUND', 'Privacy request not found', 404);
    return r;
  }

  /** Verified, and the action fits the request type. */
  private async ready(id: string, action: keyof typeof ACTION_TYPES): Promise<PrivacyRequest> {
    const r = await this.find(id);
    if (r.status !== 'IN_PROGRESS')
      throw new AppError('PRIVACY_NOT_VERIFIED', 'Verify the requester first', 409);
    if (!(ACTION_TYPES[action] as readonly string[]).includes(r.type))
      throw new AppError(
        'PRIVACY_WRONG_ACTION',
        `A ${r.type} request cannot be handled this way`,
        409,
      );
    return r;
  }

  private resolved<T extends object>(data: T) {
    return { ...data, resolvedAt: new Date(), resolvedBy: currentActor().id };
  }

  private async move(
    id: string,
    to: PrivacyRequestStatus,
    data: Prisma.PrivacyRequestUpdateInput,
    action: string,
    summary?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.privacyRequest.findUnique({ where: { id } });
      if (!r) throw new AppError('PRIVACY_REQUEST_NOT_FOUND', 'Privacy request not found', 404);
      if (!canTransitionPrivacy(r.status, to))
        throw new AppError('PRIVACY_BAD_TRANSITION', `Cannot go from ${r.status} to ${to}`, 409);
      // Conditional on the status read above, so two clicks cannot both apply.
      const { count } = await tx.privacyRequest.updateMany({
        where: { id, status: r.status },
        data: { ...data, status: to },
      });
      if (!count) throw new AppError('PRIVACY_BAD_TRANSITION', 'The request changed; reload', 409);
      await recordAudit(this.outbox, tx, SOURCE, {
        action,
        entityType: 'privacy_request',
        entityId: id,
        summary: `${r.code}: ${summary ?? `${r.status} -> ${to}`}`,
      });
    });
  }

  private async finish(
    tx: Prisma.TransactionClient,
    r: PrivacyRequest,
    result: PrivacyResult,
    action: string,
    summary: string,
    phone: string = r.phone,
  ): Promise<void> {
    const erased = phone !== r.phone;
    const { count } = await tx.privacyRequest.updateMany({
      where: { id: r.id, status: 'IN_PROGRESS' },
      data: this.resolved({
        status: 'COMPLETED' as const,
        result,
        phone,
        ...(erased ? { email: null, details: '' } : {}),
      }),
    });
    if (!count) throw new AppError('PRIVACY_BAD_TRANSITION', 'The request changed; reload', 409);
    await recordAudit(this.outbox, tx, SOURCE, {
      action,
      entityType: 'privacy_request',
      entityId: r.id,
      summary: `${r.code}: ${summary}`,
    });
  }
}
