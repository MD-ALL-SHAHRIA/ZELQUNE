import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Jost } from 'next/font/google';
import { notFound } from 'next/navigation';
import { env } from '@/config/env';
import { isLocale, LOCALES } from '@/i18n/config';
import { BanglaDisplayFont } from '@/features/layout/bangla-display-font';
import { StoreProvider } from '@/store/provider';
import '../globals.css';

// Bodoni Moda (variable, optical sizes) for headings: the high-contrast serif of luxury
// editorial; Jost for text (Latin). The Bangla pair is self-hosted (globals.css) and preloaded
// only on /bn pages.
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-bodoni',
  display: 'swap',
});
// One italic cut for accents and the day/night labels (not preloaded: below the fold).
const bodoniItalic = Bodoni_Moda({
  subsets: ['latin'],
  style: 'italic',
  axes: ['opsz'],
  variable: '--font-bodoni-italic',
  display: 'swap',
  preload: false,
});
const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

/**
 * Bangla text face (Hind Siliguri), above the fold on every /bn page. Tiro Bangla (display) is
 * loaded after the page by <BanglaDisplayFont />.
 */
const BANGLA_FONTS = ['/fonts/hind-siliguri-400-bengali.woff2'];

export const metadata: Metadata = { metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL) };

export const viewport: Viewport = {
  themeColor: '#14110F',
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
    <html lang={lang} className={`${bodoni.variable} ${bodoniItalic.variable} ${jost.variable}`}>
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
        {lang === 'bn' ? <BanglaDisplayFont /> : null}
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
