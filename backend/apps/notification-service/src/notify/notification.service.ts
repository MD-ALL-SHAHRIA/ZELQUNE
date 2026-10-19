import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import {
  type EventEnvelope,
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  paymentVerified,
  quoteRequested,
} from '@zelqune/contracts';
import { type NotificationEnv } from '../config/notification-env';
import { type Prisma } from '../generated/prisma/client';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms.provider';
import { type OrderInfo, templates } from './templates';

type Tx = Prisma.TransactionClient;

/**
 * Turns domain events into SMS. One message per (event, template); a failed send throws so the
 * consumer retries it (ADR 0009). Delivery is at-least-once: a crash between sending and
 * committing can repeat a message.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(APP_CONFIG) private readonly config: NotificationEnv,
  ) {}

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
  }

  async onPaymentVerified(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = paymentVerified.parse(event).payload;
    if (p.method === 'COD') return; // COD confirmation is announced on order.confirmed
    const contact = await this.contact(tx, p.orderId);
    if (!contact) return;
    await this.send(
      tx,
      event.id,
      'payment.verified',
      contact.phone,
      templates.paymentVerified(contact, p.amountPaisa),
    );
  }

  async onOrderConfirmed(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderConfirmed.parse(event).payload;
    const contact = await this.contact(tx, p.orderId);
    // Prepaid orders already got "payment received, confirmed".
    if (!contact || contact.paymentMethod !== 'COD') return;
    await this.send(
      tx,
      event.id,
      'order.confirmed.cod',
      contact.phone,
      templates.orderConfirmedCod(contact),
    );
  }

  async onOrderCancelled(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = orderCancelled.parse(event).payload;
    const contact = await this.contact(tx, p.orderId);
    if (!contact) return;
    await this.send(
      tx,
      event.id,
      'order.cancelled',
      contact.phone,
      templates.orderCancelled(contact, p.reason),
    );
  }

  async onQuoteRequested(event: EventEnvelope, tx: Tx): Promise<void> {
    const p = quoteRequested.parse(event).payload;
    if (!this.config.OWNER_NOTIFY_PHONE) {
      this.logger.warn(`New bulk request ${p.code}: OWNER_NOTIFY_PHONE not set, no alert sent`);
      return;
    }
    await this.send(
      tx,
      event.id,
      'quote.requested.owner',
      this.config.OWNER_NOTIFY_PHONE,
      templates.quoteRequested(p),
    );
  }

  private contact(tx: Tx, orderId: string): Promise<(OrderInfo & { phone: string }) | null> {
    return tx.orderContact.findUnique({ where: { orderId } });
  }

  private async send(
    tx: Tx,
    eventId: string,
    template: string,
    to: string,
    body: string,
  ): Promise<void> {
    const already = await tx.notificationLog.findUnique({
      where: { eventId_template: { eventId, template } },
    });
    if (already?.status === 'SENT') return;
    const { providerRef } = await this.sms.send(to, body);
    await tx.notificationLog.upsert({
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
