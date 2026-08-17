import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pottery Inventory',
  description: 'Pottery collection inventory management',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Pottery Inventory' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f9f9f9] text-[#111111]">{children}</body>
    </html>
  );
}
