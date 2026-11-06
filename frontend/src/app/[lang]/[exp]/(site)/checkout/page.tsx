import type { Metadata } from 'next';
import { CheckoutForm } from '@/features/checkout/checkout-form';
import { listDistricts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { Container, Heading } from '@/shared/ui/typography';

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
    <Container className="py-12 sm:py-16">
      <Heading as="h1" level="h1" className="mb-12">
        {dict.checkout.heading}
      </Heading>
      <CheckoutForm
        lang={lang}
        districts={await listDistricts()}
        copy={{
          checkout: dict.checkout,
          ui: dict.ui,
          cart: dict.cart,
          products: dict.products,
          product: dict.product,
          offers: dict.offers,
        }}
      />
    </Container>
  );
}
