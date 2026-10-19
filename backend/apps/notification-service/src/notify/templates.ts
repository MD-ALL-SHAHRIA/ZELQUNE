/** Bangla SMS templates (placeholder copy until the final Bangla copy is provided). */

export function formatTaka(paisa: number): string {
  const taka = paisa / 100;
  return `৳${taka.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(taka) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export interface OrderInfo {
  code: string;
  saleMode: string;
  paymentMethod: string;
  totalPaisa: number;
  advanceRequiredPaisa: number;
}

const trackUrl = (base: string, code: string) => `${base.replace(/\/$/, '')}/track?code=${code}`;

export const templates = {
  orderPlaced(o: OrderInfo, storefrontUrl: string): string {
    if (o.advanceRequiredPaisa > 0) {
      return `Zelqune: আপনার অর্ডার ${o.code} পেয়েছি। অগ্রিম ${formatTaka(o.advanceRequiredPaisa)} যাচাই হলেই অর্ডার নিশ্চিত হবে। ট্র্যাক: ${trackUrl(storefrontUrl, o.code)}`;
    }
    if (o.paymentMethod === 'COD') {
      return `Zelqune: আপনার অর্ডার ${o.code} পেয়েছি। মোট ${formatTaka(o.totalPaisa)}, ক্যাশ অন ডেলিভারি। শিগগিরই ফোনে নিশ্চিত করব।`;
    }
    return `Zelqune: আপনার অর্ডার ${o.code} পেয়েছি। পেমেন্ট ${formatTaka(o.totalPaisa)} যাচাই হলেই নিশ্চিত হবে। ট্র্যাক: ${trackUrl(storefrontUrl, o.code)}`;
  },
  paymentVerified(o: OrderInfo, amountPaisa: number): string {
    return `Zelqune: অর্ডার ${o.code}-এর ${formatTaka(amountPaisa)} পেমেন্ট পেয়েছি, অর্ডার নিশ্চিত হয়েছে। ধন্যবাদ!`;
  },
  orderConfirmedCod(o: OrderInfo): string {
    return `Zelqune: অর্ডার ${o.code} নিশ্চিত হয়েছে। ডেলিভারির সময় ${formatTaka(o.totalPaisa)} দিতে হবে।`;
  },
  orderCancelled(o: OrderInfo, reason: string): string {
    const why =
      reason === 'PAYMENT_TIMEOUT' ? 'নির্দিষ্ট সময়ে পেমেন্ট না পাওয়ায়' : 'অনিবার্য কারণে';
    return `Zelqune: অর্ডার ${o.code} ${why} বাতিল হয়েছে। প্রশ্ন থাকলে আমাদের জানান।`;
  },
  quoteRequested(q: {
    code: string;
    organizationName: string;
    itemCount: number;
    totalQty: number;
  }): string {
    return `Zelqune: নতুন বাল্ক অনুরোধ ${q.code}: ${q.organizationName}, ${q.itemCount}টি আইটেম, মোট ${q.totalQty} পিস। ড্যাশবোর্ডে দেখুন।`;
  },
};
