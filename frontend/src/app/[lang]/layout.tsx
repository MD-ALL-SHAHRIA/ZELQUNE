import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Hind_Siliguri, Manrope, Noto_Serif_Bengali } from 'next/font/google';
import { notFound } from 'next/navigation';
import { env } from '@/config/env';
import { isLocale, LOCALES } from '@/i18n/config';
import { StoreProvider } from '@/store/provider';
import '../globals.css';

// Display serif close to the wordmark, a calm sans for text; Bangla pairs (not preloaded on
// English pages' critical path: the browser fetches them only when Bangla text renders).
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const notoSerifBn = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500'],
  variable: '--font-noto-serif-bn',
  display: 'swap',
  preload: false,
});
const hind = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
  variable: '--font-hind',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = { metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL) };

export const viewport: Viewport = {
  themeColor: '#FAF6EF',
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      className={`${cormorant.variable} ${manrope.variable} ${notoSerifBn.variable} ${hind.variable}`}
    >
      <body className="min-h-dvh bg-paper text-ink">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
