import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { notFound } from 'next/navigation';
import { env } from '@/config/env';
import { isLocale, LOCALES } from '@/i18n/config';
import { StoreProvider } from '@/store/provider';
import '../globals.css';

// Display serif close to the wordmark and a calm sans for text (Latin). The Bangla pair is
// self-hosted (globals.css) and preloaded only on /bn pages.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
  display: 'swap',
});
// One italic cut for numerals and the day/night labels (not preloaded: below the fold).
const cormorantItalic = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '300',
  style: 'italic',
  variable: '--font-cormorant-italic',
  display: 'swap',
  preload: false,
});
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

/** Bangla text (Hind Siliguri) and display (Tiro Bangla) faces, above the fold on every /bn page. */
const BANGLA_FONTS = [
  '/fonts/hind-siliguri-400-bengali.woff2',
  '/fonts/tiro-bangla-400-bengali.woff2',
];

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
      className={`${cormorant.variable} ${cormorantItalic.variable} ${manrope.variable}`}
    >
      <head>
        {/* Sample photos come from Unsplash's CDN until real product photos exist. */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        {lang === 'bn'
          ? BANGLA_FONTS.map((href) => (
              <link
                key={href}
                rel="preload"
                as="font"
                type="font/woff2"
                href={href}
                crossOrigin="anonymous"
              />
            ))
          : null}
      </head>
      <body className="min-h-dvh text-ink">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
