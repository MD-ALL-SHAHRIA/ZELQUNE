import type { Metadata } from 'next';
import Link from 'next/link';
import { PurchaseSignal } from '@/components/analytics/purchase-signal';
import { notFound } from 'next/navigation';
import { ORDER_CODE } from '@/lib/forms';
import { resolvePage } from '@/lib/page-params';
import { href } from '@/lib/site';

type Params = Promise<{ lang: string; exp: string; code: string }>;

export const metadata: Metadata = { robots: { index: false } };

/** Order placed. Shows only the code from the URL: no personal data on this page. */
export default async function OrderPlaced({ params }: { params: Params }) {
  const { lang, dict } = await resolvePage(params);
  const { code } = await params;
  if (!ORDER_CODE.test(code)) notFound();
  const [before, after] = dict.success.text.split('{code}');
  return (
    <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
      <PurchaseSignal code={code} />
      <h1 className="text-3xl font-semibold text-walnut">{dict.success.heading}</h1>
      <p className="text-lg">
        {before}
        <strong data-testid="order-code" className="font-mono text-walnut">
          {code}
        </strong>
        {after}
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={`${href(lang, '/track')}?code=${code}`}
          className="rounded-md bg-walnut px-6 py-3 font-semibold text-cream"
        >
          {dict.success.track}
        </Link>
        <Link href={href(lang, '/shop')} className="rounded-md border border-walnut px-6 py-3">
          {dict.success.keepBrowsing}
        </Link>
      </div>
    </div>
  );
}
