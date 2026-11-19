import { type EmailMessage } from '../email/email.provider';
import { renderEmail } from '../email/layout';
import { formatTaka, type OrderInfo } from './templates';

type Lang = 'en' | 'bn';
export interface EmailContact extends OrderInfo {
  name: string;
  email: string;
  lang: Lang;
  /** The first product's slug, for the photo at the top. */
  productSlug?: string | null;
}
export interface PlacedItem {
  productSlug?: string;
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
/** Email-sized product photos served by the storefront (frontend/public/email/products). */
const SIGNATURE_PIECE = 'alo-arch-panel';
export const productPhoto = (base: string, slug?: string | null) =>
  `${site(base)}/email/products/${slug || SIGNATURE_PIECE}.jpg`;
const hero = (base: string, c: { productSlug?: string | null; lang: Lang }) => ({
  url: productPhoto(base, c.productSlug),
  alt: c.lang === 'bn' ? 'Zelqune-এর হাতে তৈরি পণ্য' : 'A handcrafted Zelqune piece',
});
const qty = (lang: Lang, n: number) => (lang === 'bn' ? `পরিমাণ ${n}` : `Qty ${n}`);
const track = (base: string, c: { code: string; lang: Lang }) => ({
  label: c.lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track your order',
  url: `${site(base)}/${c.lang}/track?code=${c.code}`,
});
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';
const foot = (lang: Lang) =>
  lang === 'bn'
    ? 'কোনো প্রশ্ন? এই ইমেইলের উত্তর দিন অথবা WhatsApp-এ মেসেজ করুন, আমরা সাহায্য করব।'
    : "Questions? Reply to this email or message us on WhatsApp. We're happy to help.";
const codeLabel = (c: { code: string; lang: Lang }) => ({
  label: c.lang === 'bn' ? 'অর্ডার কোড' : 'Order',
  value: c.code,
});
const isCod = (c: OrderInfo) => c.paymentMethod === 'COD';

/** The order journey shown in every order email; `at` is the step reached. */
const journey = (lang: Lang, at: number) => ({
  steps:
    lang === 'bn'
      ? ['অর্ডার', 'নিশ্চিত', 'তৈরি হচ্ছে', 'রওনা', 'পৌঁছেছে']
      : ['Placed', 'Confirmed', 'Being made', 'Shipped', 'Delivered'],
  current: at,
});

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
          ? `ডেলিভারির সময় ক্যাশে ${formatTaka(t.totalPaisa)} দেবেন। নিশ্চিত করতে আমরা শিগগিরই ফোন করব।`
          : `You'll pay ${formatTaka(t.totalPaisa)} in cash on delivery. We'll call you shortly to confirm.`
        : bn
          ? 'পেমেন্ট যাচাই হলেই অর্ডার নিশ্চিত করব।'
          : "We'll confirm your order as soon as we've verified your payment.";
  const payNow = isCod(c) ? 0 : t.advanceRequiredPaisa;
  return renderEmail({
    to: c.email,
    lang: c.lang,
    site: base,
    hero: hero(base, { lang: c.lang, productSlug: items[0]?.productSlug }),
    subject: bn ? `আপনার অর্ডার ${c.code} পেয়েছি` : `We've received your order ${c.code}`,
    eyebrow: bn ? 'অর্ডার পেয়েছি' : 'Order received',
    heading: bn ? `ধন্যবাদ, ${firstName(c.name)}।` : `Thank you, ${firstName(c.name)}.`,
    lines: [
      bn
        ? 'Zelqune থেকে অর্ডার করার জন্য ধন্যবাদ। আপনার পণ্যটি ঢাকায় আমাদের ওয়ার্কশপে যত্ন নিয়ে তৈরি ও প্যাক করা হবে।'
        : 'Thank you for ordering from Zelqune. Your piece will be made and packed with care in our Dhaka workshop.',
    ],
    code: codeLabel(c),
    progress: journey(c.lang, 0),
    items: {
      title: bn ? 'আপনার অর্ডার' : 'Your order',
      list: items.map((i) => ({
        name: (bn ? i.nameBn : i.nameEn) ?? i.sku,
        meta: qty(c.lang, i.qty),
        price: formatTaka(i.unitPricePaisa * i.qty),
        image: productPhoto(base, i.productSlug),
      })),
    },
    rows: [
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
    note: next,
    button: track(base, c),
    foot: foot(c.lang),
  });
}

export function paymentVerifiedEmail(c: EmailContact, amountPaisa: number, base: string) {
  const bn = c.lang === 'bn';
  return renderEmail({
    to: c.email,
    lang: c.lang,
    site: base,
    hero: hero(base, c),
    subject: bn
      ? `পেমেন্ট পেয়েছি, অর্ডার ${c.code} নিশ্চিত`
      : `Payment received: order ${c.code} is confirmed`,
    eyebrow: bn ? 'পেমেন্ট পেয়েছি' : 'Payment received',
    heading: bn ? 'আপনার অর্ডার নিশ্চিত হয়েছে।' : 'Your order is confirmed.',
    lines: [
      bn
        ? `অর্ডার ${c.code}-এর ${formatTaka(amountPaisa)} পেমেন্ট পেয়েছি। প্রতিটি ধাপে আমরা আপনাকে জানাব।`
        : `We've received ${formatTaka(amountPaisa)} for order ${c.code}. We'll let you know at every step until it reaches you.`,
    ],
    code: codeLabel(c),
    progress: journey(c.lang, 1),
    button: track(base, c),
    foot: foot(c.lang),
  });
}

export function orderConfirmedEmail(c: EmailContact, base: string) {
  const bn = c.lang === 'bn';
  return renderEmail({
    to: c.email,
    lang: c.lang,
    site: base,
    hero: hero(base, c),
    subject: bn ? `অর্ডার ${c.code} নিশ্চিত হয়েছে` : `Order ${c.code} is confirmed`,
    eyebrow: bn ? 'অর্ডার নিশ্চিত' : 'Order confirmed',
    heading: bn ? 'আপনার অর্ডার নিশ্চিত হয়েছে।' : 'Your order is confirmed.',
    lines: [
      bn
        ? 'প্রতিটি ধাপে আমরা আপনাকে জানাব।'
        : "We'll let you know at every step until it reaches you.",
    ],
    code: codeLabel(c),
    progress: journey(c.lang, 1),
    note: bn
      ? `ডেলিভারির সময় ক্যাশে ${formatTaka(c.totalPaisa)} দেবেন।`
      : `You'll pay ${formatTaka(c.totalPaisa)} in cash on delivery.`,
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
    IN_PRODUCTION: {
      at: 2,
      subject: bn
        ? `অর্ডার ${c.code}: আপনার পণ্য তৈরি হচ্ছে`
        : `Order ${c.code}: your piece is being made`,
      eyebrow: bn ? 'তৈরি হচ্ছে' : 'In the workshop',
      heading: bn ? 'আপনার পণ্য তৈরি হচ্ছে।' : 'Your piece is being made.',
      line: bn
        ? 'আমাদের ওয়ার্কশপে আপনার পণ্য হাতে তৈরি হচ্ছে। প্রস্তুত হলেই পাঠিয়ে দেব।'
        : "It's being made by hand in our workshop. We'll send it as soon as it's ready.",
    },
    SHIPPED: {
      at: 3,
      subject: bn ? `অর্ডার ${c.code} রওনা হয়েছে` : `Order ${c.code} is on its way`,
      eyebrow: bn ? 'রওনা হয়েছে' : 'On its way',
      heading: bn ? 'আপনার অর্ডার রওনা হয়েছে।' : 'Your order is on its way.',
      line: bn
        ? 'আপনার অর্ডার কুরিয়ারে দেওয়া হয়েছে। পৌঁছানোর আগে কুরিয়ার আপনাকে ফোন করবে।'
        : 'Your order is with the courier. They will call you before they arrive.',
    },
    DELIVERED: {
      at: 4,
      subject: bn ? `অর্ডার ${c.code} পৌঁছেছে, ধন্যবাদ!` : `Order ${c.code} has arrived. Thank you!`,
      eyebrow: bn ? 'পৌঁছেছে' : 'Delivered',
      heading: bn ? 'আপনার ঘরে স্বাগতম।' : 'Welcome home.',
      line: bn
        ? 'আপনার অর্ডার পৌঁছেছে। দেয়ালে লাগানোর পর একটা ছবি আর দুই লাইন মতামত এই ইমেইলের উত্তরে পাঠালে খুব খুশি হব।'
        : "Your order has been delivered. Once it's on your wall, we'd love a photo and a few words: just reply to this email.",
    },
  }[status];
  return renderEmail({
    to: c.email,
    lang: c.lang,
    site: base,
    hero: hero(base, c),
    subject: copy.subject,
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    lines: [copy.line],
    code: codeLabel(c),
    progress: journey(c.lang, copy.at),
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
    site: base,
    hero: hero(base, c),
    subject: bn ? `অর্ডার ${c.code} বাতিল হয়েছে` : `Order ${c.code} was cancelled`,
    eyebrow: bn ? 'অর্ডার বাতিল' : 'Order cancelled',
    heading: bn ? 'আপনার অর্ডার বাতিল হয়েছে।' : 'Your order was cancelled.',
    lines: [bn ? `অর্ডার ${c.code} ${why} বাতিল হয়েছে।` : `Order ${c.code} was cancelled ${why}.`],
    code: codeLabel(c),
    note: bn
      ? 'কোনো অগ্রিম দিয়ে থাকলে আমাদের নিয়ম অনুযায়ী ফেরত দেওয়া হবে।'
      : 'If you paid an advance, it is refunded as our refund policy describes.',
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
  base: string,
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
    eyebrow: 'New order',
    heading: `${formatTaka(t.totalPaisa)} from ${c.name}`,
    lines: [`Phone: ${c.phone}`],
    code: { label: 'Order', value: c.code },
    items: {
      title: 'Items',
      list: items.map((i) => ({
        name: i.nameEn ?? i.sku,
        meta: `Qty ${i.qty} · ${i.sku}`,
        price: formatTaka(i.unitPricePaisa * i.qty),
        image: productPhoto(base, i.productSlug),
      })),
    },
    rows: [['Delivery', formatTaka(t.shippingFeePaisa)]],
    total: ['Total', formatTaka(t.totalPaisa)],
    note: `Payment: ${method[c.paymentMethod as keyof typeof method] ?? c.paymentMethod}${
      t.advanceRequiredPaisa > 0 && c.paymentMethod !== 'COD'
        ? `. Verify the ${formatTaka(t.advanceRequiredPaisa)} advance in the dashboard.`
        : '. Call the customer to confirm.'
    }`,
    foot: 'Open the dashboard to verify the payment and confirm the order.',
  });
}

/** To the owner: a new bulk, design or construction request. */
export function ownerNewRequestEmail(to: string, smsText: string, code: string): EmailMessage {
  return renderEmail({
    to,
    lang: 'en',
    subject: `New request ${code}`,
    eyebrow: 'New request',
    heading: 'Someone asked for a quote.',
    lines: [smsText.replace(/^Zelqune: /, '')],
    code: { label: 'Request', value: code },
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
    site: base,
    hero: hero(base, { lang: r.lang }),
    subject: bn ? `আপনার অনুরোধ ${r.code} পেয়েছি` : `We've received your request ${r.code}`,
    eyebrow: bn ? 'অনুরোধ পেয়েছি' : 'Request received',
    heading: bn
      ? `ধন্যবাদ, ${firstName(r.contactName)}।`
      : `Thank you, ${firstName(r.contactName)}.`,
    lines: [
      bn
        ? 'আপনার অনুরোধ পেয়েছি। এক কর্মদিবসের মধ্যে আমাদের টিম আপনাকে ফোন করবে।'
        : "We've received your request. Our team will call you within 1 working day.",
    ],
    code: { label: bn ? 'অনুরোধ কোড' : 'Request', value: r.code },
    button: {
      label: bn ? 'অনুরোধ দেখুন' : 'Check your request',
      url: `${site(base)}/${r.lang}/bulk/track?code=${r.code}`,
    },
    foot: foot(r.lang),
  });
}
