import { type EmailMessage } from '../email/email.provider';
import { renderEmail } from '../email/layout';
import { formatTaka, type OrderInfo } from './templates';

type Lang = 'en' | 'bn';
export interface EmailContact extends OrderInfo {
  name: string;
  email: string;
  lang: Lang;
}
export interface PlacedItem {
  nameEn?: string;
  nameBn?: string;
  sku: string;
  qty: number;
  unitPricePaisa: number;
}
export interface PlacedTotals {
  subtotalPaisa: number;
  shippingFeePaisa: number;
  totalPaisa: number;
  advanceRequiredPaisa: number;
}

const site = (base: string) => base.replace(/\/$/, '');
const track = (base: string, c: { code: string; lang: Lang }) => ({
  label: c.lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track your order',
  url: `${site(base)}/${c.lang}/track?code=${c.code}`,
});
const hi = (c: { name: string; lang: Lang }) =>
  c.lang === 'bn' ? `প্রিয় ${c.name || 'গ্রাহক'},` : `Hi ${c.name || 'there'},`;
const foot = (lang: Lang) =>
  lang === 'bn'
    ? 'কোনো প্রশ্ন থাকলে এই ইমেইলের উত্তর দিন অথবা WhatsApp-এ মেসেজ করুন।'
    : 'Questions? Reply to this email or message us on WhatsApp.';
const isCod = (c: OrderInfo) => c.paymentMethod === 'COD';

/** Order received: the items, the totals and what happens next. */
export function orderPlacedEmail(
  c: EmailContact,
  items: PlacedItem[],
  t: PlacedTotals,
  base: string,
): EmailMessage {
  const bn = c.lang === 'bn';
  const next =
    t.advanceRequiredPaisa > 0 && !isCod(c)
      ? bn
        ? `আপনার ${formatTaka(t.advanceRequiredPaisa)} অগ্রিম যাচাই হলেই অর্ডার নিশ্চিত করব। বাকি টাকা ডেলিভারির সময় দেবেন।`
        : `We'll confirm your order as soon as we've verified your ${formatTaka(t.advanceRequiredPaisa)} advance. You pay the rest on delivery.`
      : isCod(c)
        ? bn
          ? `ডেলিভারির সময় ক্যাশে ${formatTaka(t.totalPaisa)} দেবেন। নিশ্চিত করতে আমরা ফোন করব।`
          : `You'll pay ${formatTaka(t.totalPaisa)} in cash on delivery. We'll call you to confirm.`
        : bn
          ? 'পেমেন্ট যাচাই হলেই অর্ডার নিশ্চিত করব।'
          : "We'll confirm your order as soon as we've verified your payment.";
  const payNow = isCod(c) ? 0 : t.advanceRequiredPaisa;
  return renderEmail({
    to: c.email,
    lang: c.lang,
    subject: bn ? `আপনার অর্ডার ${c.code} পেয়েছি` : `We've received your order ${c.code}`,
    lines: [
      hi(c),
      bn
        ? `Zelqune থেকে অর্ডার করার জন্য ধন্যবাদ। আপনার অর্ডার কোড ${c.code}।`
        : `Thank you for ordering from Zelqune. Your order code is ${c.code}.`,
      next,
    ],
    rows: [
      ...items.map((i): [string, string] => [
        `${(bn ? i.nameBn : i.nameEn) ?? i.sku} × ${i.qty}`,
        formatTaka(i.unitPricePaisa * i.qty),
      ]),
      ['', ''],
      [
        bn ? 'ডেলিভারি' : 'Delivery',
        t.shippingFeePaisa ? formatTaka(t.shippingFeePaisa) : bn ? 'ফ্রি' : 'Free',
      ],
      ...(payNow > 0
        ? ([
            [bn ? 'এখন দেবেন (অগ্রিম)' : 'Pay now (advance)', formatTaka(payNow)],
            [bn ? 'ডেলিভারির সময় দেবেন' : 'Pay on delivery', formatTaka(t.totalPaisa - payNow)],
          ] as [string, string][])
        : []),
    ],
    total: [bn ? 'মোট' : 'Total', formatTaka(t.totalPaisa)],
    button: track(base, c),
    foot: foot(c.lang),
  });
}

export function paymentVerifiedEmail(c: EmailContact, amountPaisa: number, base: string) {
  const bn = c.lang === 'bn';
  return renderEmail({
    to: c.email,
    lang: c.lang,
    subject: bn
      ? `পেমেন্ট পেয়েছি, অর্ডার ${c.code} নিশ্চিত`
      : `Payment received: order ${c.code} is confirmed`,
    lines: [
      hi(c),
      bn
        ? `অর্ডার ${c.code}-এর ${formatTaka(amountPaisa)} পেমেন্ট পেয়েছি। আপনার অর্ডার নিশ্চিত হয়েছে।`
        : `We've received ${formatTaka(amountPaisa)} for order ${c.code}. Your order is confirmed.`,
      bn
        ? 'প্রতিটি ধাপে আমরা আপনাকে জানাব।'
        : "We'll let you know at every step until it reaches you.",
    ],
    button: track(base, c),
    foot: foot(c.lang),
  });
}

export function orderConfirmedEmail(c: EmailContact, base: string) {
  const bn = c.lang === 'bn';
  return renderEmail({
    to: c.email,
    lang: c.lang,
    subject: bn ? `অর্ডার ${c.code} নিশ্চিত হয়েছে` : `Order ${c.code} is confirmed`,
    lines: [
      hi(c),
      bn
        ? `আপনার অর্ডার ${c.code} নিশ্চিত হয়েছে। ডেলিভারির সময় ${formatTaka(c.totalPaisa)} দেবেন।`
        : `Your order ${c.code} is confirmed. You'll pay ${formatTaka(c.totalPaisa)} on delivery.`,
    ],
    button: track(base, c),
    foot: foot(c.lang),
  });
}

/** The steps worth an email; other status changes stay quiet. */
export const EMAILED_STATUSES = ['IN_PRODUCTION', 'SHIPPED', 'DELIVERED'] as const;
export type EmailedStatus = (typeof EMAILED_STATUSES)[number];

export function orderStatusEmail(c: EmailContact, status: EmailedStatus, base: string) {
  const bn = c.lang === 'bn';
  const copy = {
    IN_PRODUCTION: bn
      ? {
          subject: `অর্ডার ${c.code}: আপনার পণ্য তৈরি হচ্ছে`,
          line: 'আমাদের ওয়ার্কশপে আপনার পণ্য হাতে তৈরি হচ্ছে। প্রস্তুত হলেই পাঠিয়ে দেব।',
        }
      : {
          subject: `Order ${c.code}: your piece is being made`,
          line: "Your piece is being made by hand in our workshop. We'll send it as soon as it's ready.",
        },
    SHIPPED: bn
      ? {
          subject: `অর্ডার ${c.code} রওনা হয়েছে`,
          line: 'আপনার অর্ডার কুরিয়ারে দেওয়া হয়েছে। কুরিয়ার পৌঁছানোর আগে ফোন করবে।',
        }
      : {
          subject: `Order ${c.code} is on its way`,
          line: 'Your order is with the courier. They will call you before they arrive.',
        },
    DELIVERED: bn
      ? {
          subject: `অর্ডার ${c.code} পৌঁছেছে, ধন্যবাদ!`,
          line: 'আপনার অর্ডার পৌঁছেছে। দেয়ালে লাগানোর পর একটা ছবি আর দুই লাইন মতামত এই ইমেইলের উত্তরে পাঠালে খুব খুশি হব।',
        }
      : {
          subject: `Order ${c.code} has arrived. Thank you!`,
          line: "Your order has been delivered. Once it's on your wall, we'd love a photo and a few words: just reply to this email.",
        },
  }[status];
  return renderEmail({
    to: c.email,
    lang: c.lang,
    subject: copy.subject,
    lines: [hi(c), copy.line],
    button: track(base, c),
    foot: foot(c.lang),
  });
}

export function orderCancelledEmail(c: EmailContact, reason: string, base: string) {
  const bn = c.lang === 'bn';
  const why =
    reason === 'PAYMENT_TIMEOUT'
      ? bn
        ? 'নির্দিষ্ট সময়ে পেমেন্ট না পাওয়ায়'
        : 'because we did not receive the payment in time'
      : bn
        ? 'অনিবার্য কারণে'
        : 'for a reason we could not avoid';
  return renderEmail({
    to: c.email,
    lang: c.lang,
    subject: bn ? `অর্ডার ${c.code} বাতিল হয়েছে` : `Order ${c.code} was cancelled`,
    lines: [
      hi(c),
      bn ? `অর্ডার ${c.code} ${why} বাতিল হয়েছে।` : `Order ${c.code} was cancelled ${why}.`,
      bn
        ? 'কোনো অগ্রিম দিয়ে থাকলে আমাদের নিয়ম অনুযায়ী ফেরত দেওয়া হবে।'
        : 'If you paid an advance, it is refunded as our refund policy describes.',
    ],
    button: { label: bn ? 'দোকানে ফিরে যান' : 'Back to the shop', url: `${site(base)}/${c.lang}` },
    foot: foot(c.lang),
  });
}

/** To the owner: everything needed to act on a new order without opening the dashboard. */
export function ownerNewOrderEmail(
  to: string,
  c: OrderInfo & { name: string; phone: string },
  items: PlacedItem[],
  t: PlacedTotals,
): EmailMessage {
  const method = {
    COD: 'Cash on delivery',
    BKASH_MANUAL: 'bKash advance',
    NAGAD_MANUAL: 'Nagad advance',
  };
  return renderEmail({
    to,
    lang: 'en',
    subject: `New order ${c.code} · ${formatTaka(t.totalPaisa)}`,
    lines: [
      `New order ${c.code} from ${c.name} (${c.phone}).`,
      `Payment: ${method[c.paymentMethod as keyof typeof method] ?? c.paymentMethod}${
        t.advanceRequiredPaisa > 0 && c.paymentMethod !== 'COD'
          ? `, advance ${formatTaka(t.advanceRequiredPaisa)} to verify`
          : ''
      }.`,
    ],
    rows: [
      ...items.map((i): [string, string] => [
        `${i.nameEn ?? i.sku} × ${i.qty}`,
        formatTaka(i.unitPricePaisa * i.qty),
      ]),
      ['Delivery', formatTaka(t.shippingFeePaisa)],
    ],
    total: ['Total', formatTaka(t.totalPaisa)],
    foot: 'Open the dashboard to verify the payment and confirm the order.',
  });
}

/** To the owner: a new bulk, design or construction request. */
export function ownerNewRequestEmail(to: string, smsText: string, code: string): EmailMessage {
  return renderEmail({
    to,
    lang: 'en',
    subject: `New request ${code}`,
    lines: [smsText.replace(/^Zelqune: /, '')],
    foot: 'Open the dashboard to reply with a quote.',
  });
}

/** To the person who sent a request, when they gave an email. */
export function requestReceivedEmail(
  to: string,
  r: { code: string; contactName: string; lang: Lang },
  base: string,
): EmailMessage {
  const bn = r.lang === 'bn';
  return renderEmail({
    to,
    lang: r.lang,
    subject: bn ? `আপনার অনুরোধ ${r.code} পেয়েছি` : `We've received your request ${r.code}`,
    lines: [
      hi({ name: r.contactName, lang: r.lang }),
      bn
        ? `আপনার অনুরোধ পেয়েছি। কোড ${r.code}। এক কর্মদিবসের মধ্যে আমাদের টিম আপনাকে ফোন করবে।`
        : `Thank you, we've received your request. Your code is ${r.code}. Our team will call you within 1 working day.`,
    ],
    button: {
      label: bn ? 'অনুরোধ দেখুন' : 'Check your request',
      url: `${site(base)}/${r.lang}/bulk/track?code=${r.code}`,
    },
    foot: foot(r.lang),
  });
}
