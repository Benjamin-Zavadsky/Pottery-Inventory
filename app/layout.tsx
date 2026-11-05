import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Pottery Collection', template: '%s · Pottery Collection' },
  description:
    'A catalogued collection of archaeological ceramics from across the Americas and the world.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Pottery Collection' },
};

// No maximumScale: pinch-zoom stays available (accessibility). Inputs use a
// 16px font on mobile so iOS doesn't auto-zoom on focus.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#faf8f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
