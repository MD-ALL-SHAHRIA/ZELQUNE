import { CartProvider } from '@/components/cart/cart-context';
import { cartCopy } from '@/components/cart/cart-copy';
import { CartButton } from '@/components/cart/cart-drawer';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { resolvePage, type PageParams } from '@/lib/page-params';

// Rendered on first request, then cached (ISR); builds never need the backend.
export function generateStaticParams() {
  return [];
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: PageParams;
}) {
  const { lang, dict } = await resolvePage(params);
  return (
    <CartProvider>
      <Header lang={lang} dict={dict} cart={<CartButton lang={lang} copy={cartCopy(dict)} />} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <Footer lang={lang} dict={dict} />
    </CartProvider>
  );
}
