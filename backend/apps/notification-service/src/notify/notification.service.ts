import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import {
  type EventEnvelope,
  normalizeBdPhone,
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  orderStatusChanged,
  paymentVerified,
  privacyErased,
  quoteRequested,
} from '@zelqune/contracts';
import { type NotificationEnv } from '../config/notification-env';
import { EMAIL_PROVIDER, type EmailMessage, type EmailProvider } from '../email/email.provider';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSettingsService } from '../settings/notification-settings';
import { type Prisma } from '../generated/prisma/client';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';
import {
  EMAILED_STATUSES,
  type EmailContact,
  type EmailedStatus,
  orderCancelledEmail,
  orderConfirmedEmail,
  orderPlacedEmail,
  orderStatusEmail,
  ownerNewOrderEmail,
  ownerNewRequestEmail,
  paymentVerifiedEmail,
  requestReceivedEmail,
} from './order-emails';
import { type OrderInfo, templates } from './templates';

type Tx = Prisma.TransactionClient;

/**
 * Turns domain events into SMS. One message per (event, template); a failed send throws so the
 * consumer retries it (ADR 0009). The send log is committed on its own right after the gateway
 * accepts a message, so a rollback or retry of the consumer transaction (e.g. a slow gateway
 * hitting the transaction timeout) never sends it again. Only a crash between the send and that
 * write can repeat a message.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(APP_CONFIG) private readonly config: NotificationEnv,
    /** Owner phone saved in the dashboard (ADR 0017); env OWNER_NOTIFY_PHONE without it. */
    @Optional() private readonly settings?: NotificationSettingsService,
    /** Writes the send log outside the consumer transaction. Unit tests may leave it out. */
    @Optional() private readonly db?: PrismaService,
    /** Order emails go out next to the SMS when the customer gave an email. */
    @Optional() @Inject(EMAIL_PROVIDER) private readonly mail?: EmailProvider,
  ) {}

  private async ownerPhone(): Promise<string | undefined> {
    if (!this.settings) return this.config.OWNER_NOTIFY_PHONE;
    const phone = (await this.settings.value()).ownerPhone;
    return phone ? (normalizeBdPhone(phone) ?? undefined) : undefined;
  }

  /**
   * Erasure (ADR 0020): forget the contact for erased orders, and redact every message sent to
   * this number (the log keeps that a message was sent, not to whom or what it said).
   */
  async onPrivacyErased(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = privacyErased.parse(event).payload;
    // The emails these orders used, so the log forgets them as well as the phone.
    const emails = p.erasedOrderIds.length
      ? (
          await tx.orderContact.findMany({
            where: { orderId: { in: p.erasedOrderIds }, email: { not: null } },
            select: { email: true },
          })
        ).flatMap((c) => (c.email ? [c.email] : []))
      : [];
    if (p.erasedOrderIds.length)
      await tx.orderContact.deleteMany({ where: { orderId: { in: p.erasedOrderIds } } });
    await tx.notificationLog.updateMany({
      where: { recipient: { in: [p.phone, ...emails] } },
      data: { recipient: 'ERASED', body: '[erased on request]' },
    });
  }

  async onOrderPlaced(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderPlaced.parse(event).payload;
    if (!p.customer) return; // older producers did not include contact details
    const contact = {
      code: p.code,
      name: p.customer.name,
      phone: p.customer.phone,
      saleMode: p.saleMode,
      paymentMethod: p.paymentMethod,
      totalPaisa: p.totalPaisa,
      advanceRequiredPaisa: p.advanceRequiredPaisa,
      email: p.customer.email ?? null,
      lang: p.lang ?? 'bn',
      productSlug: p.items[0]?.productSlug ?? null,
    };
    await tx.orderContact.upsert({
      where: { orderId: p.orderId },
      create: { orderId: p.orderId, ...contact },
      update: contact,
    });
    await this.send(
      tx,
      event.id,
      'order.placed',
      contact.phone,
      templates.orderPlaced(contact, this.config.STOREFRONT_URL),
    );
    const site = this.config.STOREFRONT_URL;
    const asEmail = emailContact(contact);
    if (asEmail)
      await this.sendEmail(
        tx,
        event.id,
        'order.placed.email',
        orderPlacedEmail(asEmail, p.items, p, site),
      );
    if (this.config.OWNER_NOTIFY_EMAIL)
      await this.sendEmail(
        tx,
        event.id,
        'order.placed.owner.email',
        ownerNewOrderEmail(this.config.OWNER_NOTIFY_EMAIL, contact, p.items, p, site),
      );
  }

  async onPaymentVerified(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = paymentVerified.parse(event).payload;
    if (p.method === 'COD') return; // COD confirmation is announced on order.confirmed
    const contact = await this.requireContact(tx, p.orderId);
    await this.send(
      tx,
      event.id,
      'payment.verified',
      contact.phone,
      templates.paymentVerified(contact, p.amountPaisa),
    );
    const asEmail = emailContact(contact);
    if (asEmail)
      await this.sendEmail(
        tx,
        event.id,
        'payment.verified.email',
        paymentVerifiedEmail(asEmail, p.amountPaisa, this.config.STOREFRONT_URL),
      );
  }

  async onOrderConfirmed(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderConfirmed.parse(event).payload;
    const contact = await this.requireContact(tx, p.orderId);
    // Prepaid orders already got "payment received, confirmed".
    if (contact.paymentMethod !== 'COD') return;
    await this.send(
      tx,
      event.id,
      'order.confirmed.cod',
      contact.phone,
      templates.orderConfirmedCod(contact),
    );
    const asEmail = emailContact(contact);
    if (asEmail)
      await this.sendEmail(
        tx,
        event.id,
        'order.confirmed.cod.email',
        orderConfirmedEmail(asEmail, this.config.STOREFRONT_URL),
      );
  }

  /**
   * Shop orders: an email when the piece goes into production, ships and arrives; on delivery
   * also the thank-you SMS that asks for a photo and a few words.
   */
  async onOrderStatusChanged(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderStatusChanged.parse(event).payload;
    if (p.channel !== 'B2C') return;
    if (p.to === 'DELIVERED') {
      const contact = await this.requireContact(tx, p.orderId);
      await this.send(
        tx,
        event.id,
        'order.delivered',
        contact.phone,
        templates.orderDelivered(contact),
      );
    }
    if (!(EMAILED_STATUSES as readonly string[]).includes(p.to)) return;
    const asEmail = emailContact(await this.contact(tx, p.orderId));
    if (asEmail)
      await this.sendEmail(
        tx,
        event.id,
        `order.${p.to.toLowerCase()}.email`,
        orderStatusEmail(asEmail, p.to as EmailedStatus, this.config.STOREFRONT_URL),
      );
  }

  async onOrderCancelled(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderCancelled.parse(event).payload;
    const contact = await this.requireContact(tx, p.orderId);
    await this.send(
      tx,
      event.id,
      'order.cancelled',
      contact.phone,
      templates.orderCancelled(contact, p.reason),
    );
    const asEmail = emailContact(contact);
    if (asEmail)
      await this.sendEmail(
        tx,
        event.id,
        'order.cancelled.email',
        orderCancelledEmail(asEmail, p.reason, this.config.STOREFRONT_URL),
      );
  }

  async onQuoteRequested(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = quoteRequested.parse(event).payload;
    const alert = templates.quoteRequested(p);
    const owner = await this.ownerPhone();
    if (owner) await this.send(tx, event.id, 'quote.requested.owner', owner, alert);
    else this.logger.warn(`New bulk request ${p.code}: no owner alert phone set, no SMS sent`);
    if (this.config.OWNER_NOTIFY_EMAIL)
      await this.sendEmail(
        tx,
        event.id,
        'quote.requested.owner.email',
        ownerNewRequestEmail(this.config.OWNER_NOTIFY_EMAIL, alert, p.code),
      );
    if (p.contactEmail)
      await this.sendEmail(
        tx,
        event.id,
        'quote.requested.email',
        requestReceivedEmail(
          p.contactEmail,
          { code: p.code, contactName: p.contactName, lang: p.lang ?? 'en' },
          this.config.STOREFRONT_URL,
        ),
      );
  }

  /**
   * The phone number arrives with order.placed. Events of different types are not ordered, so
   * a later event can arrive first: retry it (delay queues, ADR 0009) instead of dropping the
   * SMS. Every order has an order.placed, so the contact appears within the retry window.
   */
  private async requireContact(tx: Tx, orderId: string): Promise<ContactRow> {
    const contact = await this.contact(tx, orderId);
    if (!contact) throw new ContactNotYetKnownError(orderId);
    return contact;
  }

  private contact(tx: Tx, orderId: string): Promise<ContactRow | null> {
    return tx.orderContact.findUnique({ where: { orderId } });
  }

  /** Same once-only send log as SMS (channel EMAIL); the log keeps the subject, not the body. */
  private async sendEmail(tx: Tx, eventId: string, template: string, message: EmailMessage) {
    if (!this.mail) return;
    const log = (this.db ?? tx).notificationLog;
    const already = await log.findUnique({ where: { eventId_template: { eventId, template } } });
    if (already?.status === 'SENT') return;
    const { providerRef } = await this.mail.send(message);
    await log.upsert({
      where: { eventId_template: { eventId, template } },
      create: {
        eventId,
        template,
        channel: 'EMAIL',
        recipient: message.to,
        body: message.subject,
        status: 'SENT',
        provider: this.mail.name,
        providerRef,
      },
      update: { status: 'SENT', providerRef },
    });
  }

  private async send(
    tx: Tx,
    eventId: string,
    template: string,
    to: string,
    body: string,
  ): Promise<void> {
    const log = (this.db ?? tx).notificationLog;
    const already = await log.findUnique({
      where: { eventId_template: { eventId, template } },
    });
    if (already?.status === 'SENT') return;
    const { providerRef } = await this.sms.send(to, body);
    await log.upsert({
      where: { eventId_template: { eventId, template } },
      create: {
        eventId,
        template,
        recipient: to,
        body,
        status: 'SENT',
        provider: this.sms.name,
        providerRef,
      },
      update: { status: 'SENT', providerRef },
    });
  }
}

/** Retryable: order.placed (which carries the phone) has not been processed yet. */
export class ContactNotYetKnownError extends Error {
  constructor(orderId: string) {
    super(`Contact for order ${orderId} not known yet (order.placed not processed); retrying`);
    this.name = 'ContactNotYetKnownError';
  }
}

type ContactRow = OrderInfo & {
  name: string;
  phone: string;
  email?: string | null;
  lang?: string;
  productSlug?: string | null;
};

/** The contact as an email recipient, or null when the customer gave no email. */
function emailContact(c: ContactRow | null): EmailContact | null {
  if (!c?.email) return null;
  return {
    ...c,
    email: c.email,
    lang: c.lang === 'en' ? 'en' : 'bn',
    productSlug: c.productSlug ?? null,
  };
}
