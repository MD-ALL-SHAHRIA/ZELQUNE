import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { listDistricts } from '@/lib/api-server';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.checkout.heading} · ${dict.brand.name}`,
    description: dict.brand.seoDescription,
    alternates: alternates(lang, '/checkout'),
    robots: { index: false },
  };
}

export default async function CheckoutPage({ params }: { params: PageParams }) {
  const { lang, dict } = await resolvePage(params);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-walnut">{dict.checkout.heading}</h1>
      <CheckoutForm
        lang={lang}
        districts={await listDistricts()}
        copy={{
          checkout: dict.checkout,
          ui: dict.ui,
          cartEmpty: dict.checkout.emptyCart,
          shop: dict.cart.keepBrowsing,
        }}
      />
    </div>
  );
}
