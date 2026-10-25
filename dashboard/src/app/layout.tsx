import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

// Geist for the interface (dense, very legible numbers); the logo's Cormorant for the wordmark.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant-wordmark',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Zelqune admin', template: '%s · Zelqune admin' },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#F7F1E8' };

/** The admin's saved theme, before the first paint. */
const THEME_SCRIPT = `try{if(localStorage.getItem('zq-admin-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${cormorant.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
