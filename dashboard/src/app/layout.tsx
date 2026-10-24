import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant-wordmark',
  display: 'swap',
});
const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Zelqune admin', template: '%s · Zelqune admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
