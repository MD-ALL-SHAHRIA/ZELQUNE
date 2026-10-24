import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { notFound } from 'next/navigation';
import { env } from '@/config/env';
import { isLocale, LOCALES } from '@/i18n/config';
import { BanglaDisplayFont } from '@/features/layout/bangla-display-font';
import { THEME_KEY } from '@/features/layout/theme';
import { StoreProvider } from '@/store/provider';
import '../globals.css';

// Cormorant Garamond, the owner's chosen face (the logo's lettering): headings, the wordmark and
// the hero, set a touch heavier (500/600) than the original light cut.
const wordmark = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant-wordmark',
  display: 'swap',
});
// The hero is set entirely in the logo's face; its italic for the gold words (below the fold of
// the critical path: not preloaded).
const wordmarkItalic = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '500',
  style: 'italic',
  variable: '--font-cormorant-italic',
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

/** Day is the default; the night theme only when the visitor chose it (theme-toggle.tsx). */
const THEME_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export const metadata: Metadata = { metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL) };

export const viewport: Viewport = {
  themeColor: '#F7F1E8',
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
      suppressHydrationWarning
      className={`${wordmark.variable} ${wordmarkItalic.variable} ${jost.variable}`}
    >
      <head>
        {/* The visitor's saved theme, applied before the first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
