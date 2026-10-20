import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/i18n/config';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const hind = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '600'],
  variable: '--font-hind',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100'),
};

export const viewport: Viewport = { themeColor: '#4A3426', width: 'device-width', initialScale: 1 };

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
    <html lang={lang} className={`${inter.variable} ${hind.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
