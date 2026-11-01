import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  APP_CONFIG,
  AppError,
  currentActor,
  OutboxService,
  recordAudit,
  requestContext,
} from '@zelqune/common';
import {
  type AdminQuote,
  convertQuoteInputSchema,
  type ConvertQuoteInput,
  decideQuoteInputSchema,
  ORDER_CODE_ALPHABET,
  priceQuoteInputSchema,
  type PriceQuoteInput,
  type PublicQuote,
  quoteRequested,
  type QuoteKind,
  type QuoteStatus,
  budgetRangeSchema,
  spaceTypeSchema,
  rfqRequestSchema,
  type RfqRequest,
  type RfqResponse,
} from '@zelqune/contracts';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { CheckoutService } from '../checkout/checkout.service';
import { CHECKOUT_PARTICIPANTS, type CheckoutParticipants } from '../checkout/participants';
import { type OrderEnv } from '../config/order-env';
import { Prisma, type Quote, type QuoteLine } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertDiscountsAllowed,
  assertProductQuote,
  assertQuoteTransition,
  conversionPayment,
} from './quote-rules';

type QuoteWithLines = Quote & { lines: QuoteLine[] };
const SOURCE = 'order-service';
const CODE_ATTEMPTS = 5;

const quoteCode = () =>
  `QT-${Array.from({ length: 6 }, () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)]).join('')}`;

/**
 * B2B bulk/corporate quotes (section 5ক): public RFQ -> staff price it -> customer accepts ->
 * converted into a B2B order through the same saga, using the QUOTED prices (never
 * re-resolved from the catalog). Quotes expire after validUntil.
 */
@Injectable()
export class QuoteService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QuoteService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly checkout: CheckoutService,
    @Inject(CHECKOUT_PARTICIPANTS) private readonly participants: CheckoutParticipants,
    @Inject(APP_CONFIG) private readonly config: OrderEnv,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.expireSafely(), this.config.ORDER_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Public RFQ. */
  async request(raw: RfqRequest, customerUserId: string | null = null): Promise<RfqResponse> {
    const input = rfqRequestSchema.parse(raw);
    for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
      const code = quoteCode();
      try {
        const quote = await this.prisma.$transaction(async (tx) => {
          const q = await tx.quote.create({
            data: {
              code,
              kind: input.kind,
              organizationName: input.organizationName,
              designSpaceType: input.design?.spaceType ?? null,
              designSizeSqft: input.design?.sizeSqft ?? null,
              designDistrict: input.design?.district ?? null,
              designBudget: input.design?.budget ?? null,
              designFloors: input.design?.floors ?? null,
              contactName: input.contactName,
              phone: input.phone,
              customerUserId,
              email: input.email,
              neededBy: input.neededBy ? new Date(`${input.neededBy}T00:00:00Z`) : null,
              customizationNotes: input.customizationNotes,
              notes: input.notes,
              utm: input.utm ?? undefined,
              lines: {
                create: input.items.map((item, position) => ({
                  position,
                  description: item.description,
                  qty: item.qty,
                  requestedProductSlug: item.productSlug,
                  requestedVariantId: item.variantId,
                })),
              },
            },
          });
          await this.outbox.add(
            tx,
            quoteRequested.create(
              {
                quoteId: q.id,
                code,
                kind: input.kind,
                spaceType: input.design?.spaceType ?? null,
                organizationName: input.organizationName,
                contactName: input.contactName,
                itemCount: input.items.length,
                totalQty: input.items.reduce((n, i) => n + i.qty, 0),
                neededBy: input.neededBy,
              },
              { source: SOURCE, requestId: requestContext.requestId() },
            ),
          );
          return q;
        });
        return { quoteCode: quote.code, status: quote.status };
      } catch (err) {
        const codeTaken =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!codeTaken) throw err;
      }
    }
    throw new AppError('QUOTE_REQUEST_FAILED', 'Please try again', 503);
  }

  /** Public status (code + phone; same 404 for both mismatches). */
  async track(code: string, phone: string): Promise<PublicQuote> {
    const quote = await this.prisma.quote.findUnique({
      where: { code },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!quote || quote.phone !== phone)
      throw new AppError('QUOTE_NOT_FOUND', 'No quote with this code and phone number', 404);
    const view = await this.view(quote);
    return {
      code: view.code,
      kind: view.kind,
      design: view.design,
      status: view.status,
      organizationName: view.organizationName,
      neededBy: view.neededBy,
      validUntil: view.validUntil,
      lines: view.lines.map(({ id, description, qty, unitPricePaisa, lineTotalPaisa }) => ({
        id,
        description,
        qty,
        unitPricePaisa,
        lineTotalPaisa,
      })),
      totals: view.totals,
      orderCode: view.orderCode,
    };
  }

  async list(query: {
    status?: QuoteStatus;
    kind?: QuoteKind;
    q?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.QuoteWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q.toUpperCase() } },
              { organizationName: { contains: query.q, mode: 'insensitive' } },
              { contactName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.quote.count({ where }),
    ]);
    // One query for every converted quote's order code (not one per row).
    const orderIds = rows.flatMap((r) => (r.orderId ? [r.orderId] : []));
    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, code: true },
        })
      : [];
    const codes = new Map(orders.map((o) => [o.id, o.code]));
    const items = await Promise.all(
      rows.map(async (r) => {
        const view: Partial<AdminQuote> = await this.view(r, codes);
        delete view.lines; // the list omits lines
        return view as Omit<AdminQuote, 'lines'>;
      }),
    );
    return { items, page: query.page, limit: query.limit, total };
  }

  async get(quoteId: string): Promise<AdminQuote> {
    return this.view(await this.load(this.prisma, quoteId));
  }

  /** Staff/owner set variant + unit price per line, shipping, advance and validity. Audited. */
  async price(quoteId: string, raw: PriceQuoteInput): Promise<AdminQuote> {
    const input = priceQuoteInputSchema.parse(raw);
    const actor = currentActor();
    const quote = await this.load(this.prisma, quoteId);
    assertProductQuote(quote.kind);
    await this.expireIfDue(quote);
    assertQuoteTransition(quote.status, 'QUOTED');

    const byLine = new Map(input.lines.map((l) => [l.lineId, l]));
    const missing = quote.lines.filter((l) => !byLine.has(l.id));
    const unknown = input.lines.filter((l) => !quote.lines.some((q) => q.id === l.lineId));
    if (missing.length || unknown.length) {
      throw new AppError(
        'QUOTE_LINES_MISMATCH',
        'Price every line of the quote exactly once',
        422,
        {
          missing: missing.map((l) => l.id),
          unknown: unknown.map((l) => l.lineId),
        },
      );
    }

    // Product data and the RETAIL reference price (no experiment bucket) from the catalog.
    const snapshot = await this.participants.snapshot(
      [...new Set(input.lines.map((l) => l.variantId))],
      null,
    );
    const priced = quote.lines.map((line) => {
      const p = byLine.get(line.id)!;
      const s = snapshot[p.variantId];
      if (!s)
        throw new AppError(
          'VARIANT_NOT_AVAILABLE',
          `Variant for line "${line.description}" is not sellable`,
          422,
          { lineId: line.id },
        );
      return { line, input: p, snapshot: s };
    });
    if (new Set(priced.map((p) => p.snapshot.saleMode)).size > 1) {
      throw new AppError(
        'MIXED_SALE_MODES',
        'All lines of a quote must have the same sale mode',
        422,
      );
    }
    assertDiscountsAllowed(
      priced.map((p) => ({
        lineId: p.line.id,
        sku: p.snapshot.sku,
        retailPricePaisa: p.snapshot.price?.amountPaisa ?? null,
        unitPricePaisa: p.input.unitPricePaisa,
      })),
      this.config.B2B_MAX_DISCOUNT_PERCENT,
      actor,
      input.allowDeepDiscount,
    );
    const subtotal = priced.reduce((sum, p) => sum + p.input.unitPricePaisa * p.line.qty, 0);
    const total = subtotal + input.shippingFeePaisa;
    if (input.advanceRequiredPaisa > total) {
      throw new AppError('ADVANCE_EXCEEDS_TOTAL', 'Advance cannot be more than the total', 422);
    }
    const validUntil = input.validUntil
      ? new Date(input.validUntil)
      : new Date(Date.now() + this.config.QUOTE_VALIDITY_DAYS * 86_400_000);
    if (validUntil <= new Date())
      throw new AppError('INVALID_VALID_UNTIL', 'validUntil must be in the future', 422);

    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, quoteId);
      for (const p of priced) {
        await tx.quoteLine.update({
          where: { id: p.line.id },
          data: {
            variantId: p.snapshot.variantId,
            productId: p.snapshot.productId,
            sku: p.snapshot.sku,
            nameBn: p.snapshot.nameBn,
            nameEn: p.snapshot.nameEn,
            options: p.snapshot.options,
            saleMode: p.snapshot.saleMode,
            unitPricePaisa: p.input.unitPricePaisa,
            retailPricePaisa: p.snapshot.price?.amountPaisa ?? null,
          },
        });
      }
      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: 'QUOTED',
          shippingFeePaisa: input.shippingFeePaisa,
          advanceRequiredPaisa: input.advanceRequiredPaisa,
          validUntil,
          quotedAt: new Date(),
          quotedBy: actor.id,
        },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'quote.price',
        entityType: 'quote',
        entityId: quoteId,
        summary: `${quote.code} priced: total ${total} paisa, advance ${input.advanceRequiredPaisa}, valid until ${validUntil.toISOString().slice(0, 10)}`,
        changes: {
          lines: priced.map((p) => ({
            sku: p.snapshot.sku,
            qty: p.line.qty,
            unitPricePaisa: p.input.unitPricePaisa,
            retailPricePaisa: p.snapshot.price?.amountPaisa ?? null,
          })),
          shippingFeePaisa: input.shippingFeePaisa,
          advanceRequiredPaisa: input.advanceRequiredPaisa,
          allowDeepDiscount: input.allowDeepDiscount,
        },
      });
    });
    return this.get(quoteId);
  }

  async accept(quoteId: string): Promise<AdminQuote> {
    return this.decide(quoteId, 'ACCEPTED', null);
  }

  async reject(quoteId: string, raw: { reason?: string | null }): Promise<AdminQuote> {
    return this.decide(quoteId, 'REJECTED', decideQuoteInputSchema.parse(raw).reason);
  }

  /**
   * ACCEPTED quote -> B2B order with the quoted prices, shipping and advance (no line cap).
   * advance = 0 (COD) is OWNER only. Runs the checkout saga (stock, payment, order).
   */
  async convert(
    quoteId: string,
    raw: ConvertQuoteInput,
  ): Promise<{ orderCode: string; orderId: string }> {
    const input = convertQuoteInputSchema.parse(raw);
    const actor = currentActor();
    const quote = await this.load(this.prisma, quoteId);
    assertProductQuote(quote.kind);
    await this.expireIfDue(quote);
    if (quote.status !== 'ACCEPTED')
      throw new AppError(
        'QUOTE_NOT_ACCEPTED',
        `Quote is ${quote.status}; only accepted quotes can be converted`,
        409,
      );
    if (quote.orderId)
      throw new AppError('QUOTE_ALREADY_CONVERTED', 'This quote was already converted', 409);
    const lines = quote.lines.map((l) => {
      if (!l.variantId || !l.productId || !l.sku || l.unitPricePaisa === null || !l.saleMode) {
        throw new AppError('QUOTE_NOT_PRICED', 'Every line must be priced before conversion', 409);
      }
      return {
        variantId: l.variantId,
        productId: l.productId,
        sku: l.sku,
        nameBn: l.nameBn ?? l.description,
        nameEn: l.nameEn ?? l.description,
        options: (l.options as Record<string, string> | null) ?? {},
        saleMode: l.saleMode,
        unitPricePaisa: l.unitPricePaisa,
        qty: l.qty,
      };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.unitPricePaisa * l.qty, 0);
    const shippingFee = quote.shippingFeePaisa ?? 0;
    const totals = {
      subtotalPaisa: subtotal,
      discountPaisa: 0,
      shippingFeePaisa: shippingFee,
      totalPaisa: subtotal + shippingFee,
      advanceRequiredPaisa: quote.advanceRequiredPaisa ?? 0,
    };
    const payment = conversionPayment(
      input.paymentMethod,
      totals.advanceRequiredPaisa,
      totals.totalPaisa,
      actor,
    );

    // Zone and weight for the shipment record only; the fee is the quoted one.
    const snapshot = await this.participants.snapshot(
      [...new Set(lines.map((l) => l.variantId))],
      null,
    );
    const shipping = await this.participants.quoteShipping({
      district: input.address.district,
      area: input.address.area,
      lines: lines.map((l) => ({
        qty: l.qty,
        packageWeightGrams: snapshot[l.variantId]?.packageWeightGrams ?? null,
        packageLengthMm: snapshot[l.variantId]?.packageLengthMm ?? null,
        packageWidthMm: snapshot[l.variantId]?.packageWidthMm ?? null,
        packageHeightMm: snapshot[l.variantId]?.packageHeightMm ?? null,
      })),
    });

    const placed = await this.checkout.runSaga({
      source: { kind: 'quote', quoteId },
      channel: 'B2B',
      customerUserId: quote.customerUserId,
      saleMode: lines[0].saleMode,
      customer: {
        name: quote.organizationName
          ? `${quote.contactName} (${quote.organizationName})`
          : quote.contactName,
        phone: quote.phone,
      },
      address: { ...input.address, note: input.address.note ?? null },
      lines,
      totals,
      shipping: { zone: shipping.zone, chargeableWeightGrams: shipping.chargeableWeightGrams },
      payment: {
        method: input.paymentMethod,
        kind: payment.kind,
        amountPaisa: payment.amountPaisa,
        trxId: input.trxId,
        payerPhone: input.payerPhone ?? (input.paymentMethod === 'COD' ? null : quote.phone),
      },
      experimentKey: null,
      utm: (quote.utm as Record<string, string> | null) ?? undefined,
      organizationId: null,
    });
    await this.prisma.$transaction((tx) =>
      recordAudit(this.outbox, tx, SOURCE, {
        action: 'quote.convert',
        entityType: 'quote',
        entityId: quoteId,
        summary: `${quote.code} converted to B2B order ${placed.code} (${payment.kind} ${payment.amountPaisa} paisa)`,
        changes: {
          orderId: placed.orderId,
          orderCode: placed.code,
          paymentMethod: input.paymentMethod,
        },
      }),
    );
    return { orderCode: placed.code, orderId: placed.orderId };
  }

  /** QUOTED and accepted-but-unconverted quotes past validUntil become EXPIRED. */
  async expireDue(now = new Date()): Promise<number> {
    const { count } = await this.prisma.quote.updateMany({
      where: { status: { in: ['QUOTED', 'ACCEPTED'] }, orderId: null, validUntil: { lt: now } },
      data: { status: 'EXPIRED' },
    });
    return count;
  }

  private async decide(
    quoteId: string,
    to: 'ACCEPTED' | 'REJECTED',
    reason: string | null,
  ): Promise<AdminQuote> {
    const quote = await this.load(this.prisma, quoteId);
    await this.expireIfDue(quote);
    if (quote.orderId)
      throw new AppError('QUOTE_ALREADY_CONVERTED', 'This quote was already converted', 409);
    assertQuoteTransition(quote.status, to, quote.kind);
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, quoteId);
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: to, decisionReason: reason },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: to === 'ACCEPTED' ? 'quote.accept' : 'quote.reject',
        entityType: 'quote',
        entityId: quoteId,
        summary: `${quote.code} ${to.toLowerCase()}${reason ? `: ${reason}` : ''}`,
        changes: { from: quote.status, to, reason },
      });
    });
    return this.get(quoteId);
  }

  /** Lazily expires an overdue quote before acting on it, then refuses the action. */
  private async expireIfDue(quote: Quote): Promise<void> {
    const due =
      (quote.status === 'QUOTED' || quote.status === 'ACCEPTED') &&
      !quote.orderId &&
      quote.validUntil &&
      quote.validUntil < new Date();
    if (!due) return;
    await this.prisma.quote.updateMany({
      where: { id: quote.id, status: quote.status },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('QUOTE_EXPIRED', 'This quote has expired; price it again', 409);
  }

  private async expireSafely(): Promise<void> {
    try {
      const n = await this.expireDue();
      if (n > 0) this.logger.log(`Expired ${n} quote(s)`);
    } catch (err) {
      this.logger.error({ err }, 'Quote expiry sweep failed');
    }
  }

  private async load(
    db: Prisma.TransactionClient | PrismaService,
    quoteId: string,
  ): Promise<QuoteWithLines> {
    const quote = await db.quote.findUnique({
      where: { id: z.uuid().parse(quoteId) },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!quote) throw new AppError('QUOTE_NOT_FOUND', 'Quote not found', 404);
    return quote;
  }

  private async lock(tx: Prisma.TransactionClient, quoteId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM quotes WHERE id = ${quoteId}::uuid FOR UPDATE`;
  }

  /** `orderCodes` (from a list) saves a lookup per converted quote. */
  private async view(q: QuoteWithLines, orderCodes?: Map<string, string>): Promise<AdminQuote> {
    const priced = q.lines.every((l) => l.unitPricePaisa !== null);
    const subtotal = q.lines.reduce((sum, l) => sum + (l.unitPricePaisa ?? 0) * l.qty, 0);
    const order = !q.orderId
      ? null
      : orderCodes
        ? { code: orderCodes.get(q.orderId) ?? null }
        : await this.prisma.order.findUnique({ where: { id: q.orderId }, select: { code: true } });
    return {
      id: q.id,
      code: q.code,
      kind: q.kind,
      design:
        q.kind !== 'PRODUCT' && q.designSpaceType
          ? {
              spaceType: spaceTypeSchema.parse(q.designSpaceType),
              sizeSqft: q.designSizeSqft,
              district: q.designDistrict,
              budget: budgetRangeSchema.catch('NOT_SURE').parse(q.designBudget),
              floors: q.designFloors,
            }
          : null,
      status: q.status,
      organizationName: q.organizationName,
      contactName: q.contactName,
      phone: q.phone,
      email: q.email,
      neededBy: q.neededBy?.toISOString().slice(0, 10) ?? null,
      validUntil: q.validUntil?.toISOString() ?? null,
      customizationNotes: q.customizationNotes,
      notes: q.notes,
      lines: q.lines.map((l) => ({
        id: l.id,
        description: l.description,
        qty: l.qty,
        variantId: l.variantId,
        sku: l.sku,
        unitPricePaisa: l.unitPricePaisa,
        lineTotalPaisa: l.unitPricePaisa === null ? null : l.unitPricePaisa * l.qty,
      })),
      totals:
        priced && q.status !== 'NEW'
          ? {
              subtotalPaisa: subtotal,
              shippingFeePaisa: q.shippingFeePaisa ?? 0,
              totalPaisa: subtotal + (q.shippingFeePaisa ?? 0),
              advanceRequiredPaisa: q.advanceRequiredPaisa ?? 0,
            }
          : null,
      quotedAt: q.quotedAt?.toISOString() ?? null,
      quotedBy: q.quotedBy,
      createdAt: q.createdAt.toISOString(),
      orderId: q.orderId,
      orderCode: order?.code ?? null,
    };
  }
}
